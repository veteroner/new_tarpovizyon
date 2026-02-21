#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Split a large MySQL .sql file into smaller chunks safe for phpMyAdmin upload.

- Keeps DROP/CREATE (and header comments) only in the first chunk.
- Splits at statement boundaries (semicolon).
- Subsequent chunks contain only INSERT statements.

Usage:
  python split_sql_file.py input.sql --outdir out --max-bytes 1900000

Defaults max-bytes ~1.9MB to fit common phpMyAdmin limits.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Statement:
    text: str
    kind: str  # 'header' | 'ddl' | 'insert' | 'other'


def classify(stmt: str) -> str:
    s = stmt.strip().lower()
    if not s:
        return 'other'
    if s.startswith('--') or s.startswith('/*'):
        return 'header'
    if s.startswith('drop table') or s.startswith('create table') or s.startswith('alter table'):
        return 'ddl'
    if s.startswith('insert into'):
        return 'insert'
    return 'other'


def split_statements(sql: str) -> list[str]:
    """Split SQL into statements using a minimal parser.

    We only need to handle: quotes (' and "), backticks, and comments.
    """
    out: list[str] = []
    buf: list[str] = []

    in_single = False
    in_double = False
    in_backtick = False
    in_line_comment = False
    in_block_comment = False

    i = 0
    n = len(sql)
    while i < n:
        ch = sql[i]
        nxt = sql[i + 1] if i + 1 < n else ''

        if in_line_comment:
            buf.append(ch)
            if ch == '\n':
                in_line_comment = False
            i += 1
            continue

        if in_block_comment:
            buf.append(ch)
            if ch == '*' and nxt == '/':
                buf.append(nxt)
                i += 2
                in_block_comment = False
            else:
                i += 1
            continue

        # start comments (only if not inside quotes)
        if not in_single and not in_double and not in_backtick:
            if ch == '-' and nxt == '-':
                buf.append(ch)
                buf.append(nxt)
                i += 2
                in_line_comment = True
                continue
            if ch == '/' and nxt == '*':
                buf.append(ch)
                buf.append(nxt)
                i += 2
                in_block_comment = True
                continue

        # toggle quotes/backticks
        if ch == "'" and not in_double and not in_backtick:
            # handle escaped single quote ''
            if in_single and nxt == "'":
                buf.append(ch)
                buf.append(nxt)
                i += 2
                continue
            in_single = not in_single
            buf.append(ch)
            i += 1
            continue

        if ch == '"' and not in_single and not in_backtick:
            in_double = not in_double
            buf.append(ch)
            i += 1
            continue

        if ch == '`' and not in_single and not in_double:
            in_backtick = not in_backtick
            buf.append(ch)
            i += 1
            continue

        # statement terminator
        if ch == ';' and not in_single and not in_double and not in_backtick:
            buf.append(ch)
            stmt = ''.join(buf).strip()
            if stmt:
                out.append(stmt)
            buf = []
            i += 1
            continue

        buf.append(ch)
        i += 1

    tail = ''.join(buf).strip()
    if tail:
        out.append(tail)
    return out


def write_chunks(stmts: list[Statement], outdir: Path, base: str, max_bytes: int) -> list[Path]:
    outdir.mkdir(parents=True, exist_ok=True)

    header = "".join(s.text + "\n\n" for s in stmts if s.kind in {'header'})
    ddl = "".join(s.text + "\n\n" for s in stmts if s.kind == 'ddl')
    inserts = [s.text for s in stmts if s.kind == 'insert']
    other = [s.text for s in stmts if s.kind == 'other']

    if other:
        # Preserve any non-header/ddl/insert statements in first chunk
        ddl = ddl + "".join(o + "\n\n" for o in other)

    chunks: list[str] = []

    # first chunk starts with header + ddl
    current = header + ddl

    def flush(idx: int, content: str) -> None:
        chunks.append(content.rstrip() + "\n")

    # add inserts keeping size under max
    for ins in inserts:
        candidate = current + ins + "\n\n"
        if len(candidate.encode('utf-8')) > max_bytes and current.strip():
            flush(len(chunks) + 1, current)
            # next chunk: no header/ddl, just inserts
            current = ins + "\n\n"
        else:
            current = candidate

    if current.strip():
        flush(len(chunks) + 1, current)

    paths: list[Path] = []
    total = len(chunks)
    for i, content in enumerate(chunks, 1):
        p = outdir / f"{base}.part{i:03d}-of-{total:03d}.sql"
        p.write_text(content, encoding='utf-8')
        paths.append(p)
    return paths


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('input', type=Path)
    ap.add_argument('--outdir', type=Path, required=True)
    ap.add_argument('--max-bytes', type=int, default=1_900_000)
    args = ap.parse_args()

    sql = args.input.read_text(encoding='utf-8', errors='replace')
    raw_stmts = split_statements(sql)

    stmts: list[Statement] = []
    for s in raw_stmts:
        kind = classify(s)
        stmts.append(Statement(text=s, kind=kind))

    base = args.input.stem
    out_paths = write_chunks(stmts, args.outdir, base, args.max_bytes)

    total_bytes = sum(p.stat().st_size for p in out_paths)
    print(f"Split {args.input.name} -> {len(out_paths)} parts in {args.outdir}")
    print(f"Total bytes: {total_bytes:,} (max per file: {args.max_bytes:,})")
    for p in out_paths[:5]:
        print(f"  {p.name} ({p.stat().st_size/1024:.1f} KB)")
    if len(out_paths) > 5:
        print(f"  ... +{len(out_paths)-5} more")


if __name__ == '__main__':
    main()
