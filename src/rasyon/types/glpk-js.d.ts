declare module 'glpk.js' {
  export interface GLPKVariable {
    name: string
    coef: number
  }

  export interface GLPKBounds {
    type: number
    ub: number
    lb: number
  }

  export interface GLPKConstraint {
    name: string
    vars: GLPKVariable[]
    bnds: GLPKBounds
  }

  export interface GLPKProblem {
    name: string
    objective: {
      direction: number
      name: string
      vars: GLPKVariable[]
    }
    subjectTo: GLPKConstraint[]
    bounds: Array<{
      name: string
      type: number
      ub?: number
      lb?: number
    }>
  }

  export interface GLPKResult {
    result: {
      status: number
      vars: Record<string, number>
      z?: number
    }
  }

  export interface GLPK {
    GLP_MIN: number
    GLP_MAX: number
    GLP_UP: number
    GLP_LO: number
    GLP_DB: number
    GLP_FX: number
    GLP_FR: number
    GLP_OPT: number
    GLP_FEAS: number
    GLP_INFEAS: number
    GLP_NOFEAS: number
    GLP_UNBND: number
    GLP_UNDEF: number
    solve(problem: GLPKProblem, options?: Record<string, unknown>): Promise<GLPKResult>
  }

  const GLPKFactory: () => Promise<GLPK>
  export default GLPKFactory
}
