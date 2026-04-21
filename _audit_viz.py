import re, os, glob

files = sorted(glob.glob('src/pages/*.tsx') + glob.glob('src/pages/trade/*.tsx'))
files = [f for f in files if not f.endswith('.old.tsx') and '_OLD_BACKUP' not in f and not os.path.basename(f).startswith('.')]

for fp in files:
    content = open(fp).read()
    name = os.path.basename(fp)
    dirpart = os.path.dirname(fp).replace('src/pages/', '')
    if dirpart and dirpart != 'src/pages':
        name = dirpart + '/' + name

    # Extract recharts imports
    recharts_blocks = re.findall(r"import\s*\{([^}]*)\}\s*from\s*['\"]recharts['\"]", content, re.DOTALL)
    recharts_items = []
    for block in recharts_blocks:
        items = [x.strip() for x in block.replace('\n', ' ').split(',') if x.strip()]
        recharts_items.extend(items)

    # Key chart types only
    chart_keywords = ['Chart', 'Treemap', 'Sankey', 'Funnel', 'Radar', 'Scatter']
    chart_types = [x for x in recharts_items if any(kw in x for kw in chart_keywords)]

    has_heatmap = 'TurkeyHeatMap' in content
    has_kpi = bool(re.search(r'KPICard|KpiCard', content))
    has_insight = 'InsightCard' in content
    has_table = 'DataTable' in content
    has_product_sel = 'ProductSelector' in content
    has_map = 'MapContainer' in content

    # Products array detection
    products_match = re.findall(r"(?:products|categories|PRODUCTS|productList|ITEM_GROUPS|urunler|items)\s*[:=]\s*\[([^\]]{10,500})\]", content)
    products = ''
    if products_match:
        # Extract quoted strings
        quoted = re.findall(r"['\"]([^'\"]+)['\"]", products_match[0][:500])
        if quoted:
            products = ', '.join(quoted[:30])

    # Commented out charts  
    commented = re.findall(r'//.*(?:BarChart|LineChart|AreaChart|PieChart|ComposedChart|Treemap|Sankey|HeatMap|RadarChart|ScatterChart)', content)
    
    # Check for imported-but-not-used-in-JSX
    unused = []
    for item in recharts_items:
        if item in ['ResponsiveContainer', 'Tooltip', 'XAxis', 'YAxis', 'CartesianGrid', 'Legend', 'Cell', 'ZAxis']:
            continue
        # Check if used in JSX (as <ComponentName)
        jsx_pattern = '<' + item
        if jsx_pattern not in content:
            unused.append(item)

    # Other viz components
    other_viz = []
    if 'TreemapContent' in content: other_viz.append('TreemapContent')
    if 'WeatherWidget' in content: other_viz.append('WeatherWidget')
    if 'ConfidenceBadge' in content: other_viz.append('ConfidenceBadge')
    if 'ModelWarningBox' in content: other_viz.append('ModelWarningBox')
    if 'ReactMarkdown' in content: other_viz.append('ReactMarkdown')
    if 'TuikPlantCategoryPage' in content and name != 'TuikPlantCategoryPage.tsx': other_viz.append('TuikPlantCategoryPage(wrapper)')

    # Is it a wrapper page?
    is_wrapper = 'TuikPlantCategoryPage' in content and name != 'TuikPlantCategoryPage.tsx'
    
    print(f'=== {name} ===')
    if is_wrapper:
        # Try to extract the category/products passed
        cat_match = re.findall(r'category[=:]\s*["\']([^"\']+)["\']', content)
        items_match = re.findall(r'items=\{?\[([^\]]+)\]', content)
        print(f'RECHARTS: WRAPPER (delegates to TuikPlantCategoryPage)')
        if cat_match:
            print(f'CATEGORY: {cat_match[0]}')
        if items_match:
            item_names = re.findall(r"['\"]([^'\"]+)['\"]", items_match[0])
            print(f'PRODUCTS: {", ".join(item_names[:30])}')
        print(f'TURKEY_HEATMAP: delegated')
        print(f'KPI_CARD: delegated')
        print(f'INSIGHT_CARD: delegated')
        print(f'DATA_TABLE: delegated')
        print(f'PRODUCT_SELECTOR: delegated')
        print(f'MAP_CONTAINER: no')
        print(f'OTHER_VIZ: TuikPlantCategoryPage(wrapper)')
        print(f'COMMENTED_OUT: none')
        print(f'NOTES: Thin wrapper around TuikPlantCategoryPage')
    else:
        print(f'RECHARTS: [{", ".join(recharts_items)}]' if recharts_items else 'RECHARTS: NONE')
        print(f'TURKEY_HEATMAP: {"yes" if has_heatmap else "no"}')
        print(f'KPI_CARD: {"yes" if has_kpi else "no"}')
        print(f'INSIGHT_CARD: {"yes" if has_insight else "no"}')
        print(f'DATA_TABLE: {"yes" if has_table else "no"}')
        print(f'PRODUCT_SELECTOR: {"yes" if has_product_sel else "no"}')
        print(f'MAP_CONTAINER: {"yes" if has_map else "no"}')
        print(f'OTHER_VIZ: [{", ".join(other_viz)}]' if other_viz else 'OTHER_VIZ: NONE')
        if products:
            print(f'PRODUCTS: {products}')
        if commented:
            print(f'COMMENTED_OUT: {commented}')
        if unused:
            print(f'IMPORTED_NOT_USED_IN_JSX: [{", ".join(unused)}]')
        # Special notes
        notes = []
        if name == 'TradePage.tsx':
            notes.append('Tab container - delegates viz to trade/ sub-tabs')
        if name == 'HomePage.tsx' or name == 'SelectionPage.tsx' or name == 'ProgramSelectionPage.tsx':
            notes.append('Navigation/selection page - no data viz')
        if not recharts_items and not has_heatmap and not is_wrapper:
            notes.append('NO RECHARTS OR HEATMAP')
        if notes:
            print(f'NOTES: {"; ".join(notes)}')
    print()
