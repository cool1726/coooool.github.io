declare module 'react-katex' {
  import { Component } from 'react'

  export interface MathProps {
    math?: string
    children?: React.ReactNode
    errorColor?: string
    renderError?: (error: Error) => React.ReactNode
  }

  export class BlockMath extends Component<MathProps> {}
  export class InlineMath extends Component<MathProps> {}
}

