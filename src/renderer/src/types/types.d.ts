declare module 'libopencor' {
  const libOpenCOR: () => Promise<unknown>;

  export default libOpenCOR;
}

declare module 'plotly.js-gl2d-dist-min' {
  export default Plotly;
}
