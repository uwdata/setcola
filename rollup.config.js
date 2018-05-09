import resolve from "rollup-plugin-node-resolve";

export default {
  input: "src/index.js",
  output: {
    file: "dist/setcola.js", 
    format: "umd",
    name: "setcola"
  },
  plugins: [
    resolve()
  ]
};