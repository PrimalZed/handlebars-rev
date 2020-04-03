#!/usr/bin/env node

import { Command, createCommand } from "commander";
import { promises as fsPromises } from "fs";
import { concat, from, combineLatest } from "rxjs";
import { map, mergeMap, tap, switchMap } from "rxjs/operators";
import * as chalk from "chalk";
import * as glob from "glob";
import * as Handlebars from "handlebars";
import * as handlebarsHelpers from "handlebars-helpers";
import * as handlebarsRepeat from "handlebars-helper-repeat";

interface HandlebarsRevCommand extends Command {
  main: string;
  partials: string;
  data: string;
  output: string;
}

const commander = createCommand()
  .version("0.0.1")
  .name("handlebars-rev")
  .description("A CLI for generating a file from a handlebars template")
  .usage("--main src/index.handlebars --partials src/partials --data src/data.json --output my-sheet.html")
  .option("-m, --main <file path>", "Path to the main handlebars file")
  .option("-p, --partials <directory path>", "Directory containing partial handlebars files", "partials")
  .option("-d, --data <file path>", "Path to the data json file")
  .option("-o, --output <file path>", "The name of the output file")
  .parse(process.argv) as HandlebarsRevCommand;

if (!commander.main || !commander.partials || !commander.data || !commander.output) {
  if (!commander.main) {
    console.warn(chalk.yellow("-m or --main parameter is required."));
  }
  if (!commander.data) {
    console.warn(chalk.yellow("-d or --data parameter is required."));
  }
  if (!commander.output) {
    console.warn(chalk.yellow("-o or --output parameter is required."));
  }
  commander.outputHelp();
  process.exit();
}

const partialMatchesPromise: Promise<string[]> = new Promise((resolve, reject) => {
  glob(`${commander.partials}/**`, { nodir: true }, (err, matches) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(matches);
  })
});

const registerPartials$ = from(partialMatchesPromise)
  .pipe(
    tap((matches) => {
      if (!matches.length) {
        console.warn(chalk.yellow(`Warning: Did not find any files in partials folder '${commander.partials}'`));
      }
    }),
    mergeMap((matches) => from(matches)),
    mergeMap((match) => from(fsPromises.readFile(match, { encoding: "utf8" })).pipe(map((file) => ({ match, file })))),
    tap(({ match, file }) => {
      const fileName = match.split("/").slice(-1)[0];
      const partialName = fileName.split(".")[0];

      Handlebars.registerPartial(partialName, file);
    })
  );

const template$ = from(fsPromises.readFile(commander.main, { encoding: "utf8" }))
  .pipe(
    map((file) => Handlebars.compile(file))
  );

const data$ = from(fsPromises.readFile(commander.data, { encoding: "utf8" }))
  .pipe(
    map((file) => JSON.parse(file))
  );

const writeFile$ = combineLatest(template$, data$)
  .pipe(
    map(([template, data]) => template(data)),
    switchMap((outFile) => fsPromises.writeFile(commander.output, outFile))
  );

for (let [key, value] of Object.entries(handlebarsHelpers())) {
  Handlebars.registerHelper(key, value as any);
}

Handlebars.registerHelper("repeat", handlebarsRepeat);

const generate$ = concat(registerPartials$, writeFile$);

generate$.subscribe();
