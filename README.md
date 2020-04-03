A CLI for generating a file from a handlebars template

```
hbs-rev --main main-template.handlebars --partials root-partials-directory --data data.json --output generated.html
```

Files in the `partials` directory can be referenced as [partials](https://handlebarsjs.com/guide/partials.html) based on the file name.  For example, the file `root-partials-directory/layout.handlebars` becomes the partial `{{#> layout}}`

Includes additional helpers:
*  https://github.com/helpers/handlebars-helpers#helpers
*  https://github.com/helpers/handlebars-helper-repeat#usage-examples

Example usage: https://github.com/PrimalZed/handlebars-poc
