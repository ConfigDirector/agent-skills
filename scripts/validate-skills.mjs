#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPOSITORY = join(import.meta.dirname, "..");
const SKILLS_DIRECTORY = "skills";
const SKILL_FILE = "SKILL.md";
const CHANGELOG = "CHANGELOG.md";
const RELEASE_HEADING = /^## \[(\d+\.\d+\.\d+)\]/;
const FRONTMATTER_FENCE = "---";
const FIRST_FRONTMATTER_LINE_NUMBER = 2;
const FIELD_LINE = /^(  )?([a-z][a-z0-9-]*):(.*)$/;
const YAML_INDICATORS = new Set("?:,[]{}#&*!|>'\"%@`");
const NAME_PART = /^[a-z0-9]+$/;
const DESCRIPTION_MAXIMUM_LENGTH = 1024;

const splitLines = (content) =>
  content.split("\n").map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line));

const listSkills = () => {
  const skillsPath = join(REPOSITORY, SKILLS_DIRECTORY);
  if (!existsSync(skillsPath)) {
    return [];
  }
  return readdirSync(skillsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ directory: entry.name, file: join(SKILLS_DIRECTORY, entry.name, SKILL_FILE) }));
};

const findNewestRelease = () => {
  const changelogPath = join(REPOSITORY, CHANGELOG);
  if (!existsSync(changelogPath)) {
    return { problem: `${CHANGELOG} is missing` };
  }
  const version = splitLines(readFileSync(changelogPath, "utf8"))
    .map((line) => line.match(RELEASE_HEADING))
    .find((match) => match !== null)?.[1];
  if (version === undefined) {
    return { problem: `${CHANGELOG} has no "## [x.y.z]" release heading` };
  }
  return { version: { value: version, source: `the newest release in ${CHANGELOG}` } };
};

const splitFrontmatter = (content) => {
  const lines = splitLines(content);
  if (lines[0] !== FRONTMATTER_FENCE) {
    return { problem: `does not start with a ${FRONTMATTER_FENCE} frontmatter block` };
  }
  const closingFence = lines.indexOf(FRONTMATTER_FENCE, 1);
  if (closingFence === -1) {
    return { problem: `frontmatter block has no closing ${FRONTMATTER_FENCE}` };
  }
  return { frontmatterLines: lines.slice(1, closingFence), body: lines.slice(closingFence + 1).join("\n") };
};

const isPlainText = (text) =>
  !YAML_INDICATORS.has(text[0]) &&
  !text.startsWith("- ") &&
  !text.includes(": ") &&
  !text.endsWith(":") &&
  !text.includes(" #");

const readValue = (text) => {
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    const quoted = text.slice(1, -1);
    return quoted.includes('"') || quoted.includes("\\") ? undefined : quoted;
  }
  return isPlainText(text) ? text : undefined;
};

const parseFrontmatter = (frontmatterLines, report) => {
  const fields = new Map();
  let parent;
  for (const [index, line] of frontmatterLines.entries()) {
    if (line.trim() === "") {
      continue;
    }
    const [, nestedIndent, key, textAfterColon] = line.match(FIELD_LINE) ?? [];
    const isNested = nestedIndent !== undefined;
    const isKeyValueLine =
      key !== undefined &&
      (textAfterColon === "" || textAfterColon.startsWith(" ")) &&
      (!isNested || parent !== undefined);
    if (!isKeyValueLine) {
      report(`line ${FIRST_FRONTMATTER_LINE_NUMBER + index} is not a flat "key: value" frontmatter field`);
      continue;
    }

    const text = textAfterColon.trim();
    let field;
    if (isNested) {
      field = `${parent}.${key}`;
    } else {
      field = key;
      parent = text === "" ? key : undefined;
    }
    if (fields.has(field)) {
      report(`${field} appears more than once`);
    }
    const value = readValue(text);
    if (value === undefined) {
      report(`${field} is not text YAML reads as written: put it in double quotes, with no " or \\ inside`);
    }
    fields.set(field, value ?? text);
  }
  return fields;
};

const checkField = (fields, field, expected, report) => {
  const value = fields.get(field);
  if (!value) {
    report(`${field} is missing`);
  } else if (value !== expected.value) {
    report(`${field} is "${value}", expected "${expected.value}" (${expected.source})`);
  }
};

const isKebabCase = (name) => name.split("-").every((part) => NAME_PART.test(part));

const checkSkill = (skill, expectedVersion, problems) => {
  const skillPath = join(REPOSITORY, skill.file);
  if (!existsSync(skillPath)) {
    problems.push(`${skill.file} is missing`);
    return;
  }
  const report = (problem) => problems.push(`${skill.file}: ${problem}`);
  const frontmatter = splitFrontmatter(readFileSync(skillPath, "utf8"));
  if (frontmatter.problem) {
    report(frontmatter.problem);
    return;
  }
  const fields = parseFrontmatter(frontmatter.frontmatterLines, report);

  checkField(fields, "name", { value: skill.directory, source: "the directory name" }, report);
  const name = fields.get("name");
  if (name && !isKebabCase(name)) {
    report(`name "${name}" is not lowercase letters and digits with single hyphens between them`);
  }

  const description = fields.get("description");
  const descriptionLength = [...(description ?? "")].length;
  if (!description) {
    report("description is missing");
  } else if (descriptionLength > DESCRIPTION_MAXIMUM_LENGTH) {
    report(`description is ${descriptionLength} characters, over the limit of ${DESCRIPTION_MAXIMUM_LENGTH}`);
  }

  checkField(fields, "license", { value: "MIT", source: "the repository license" }, report);
  checkField(
    fields,
    "metadata.author",
    { value: "ConfigDirector", source: "the publisher of these skills" },
    report,
  );
  if (expectedVersion !== undefined) {
    checkField(fields, "metadata.version", expectedVersion, report);
  }

  if (frontmatter.body.trim() === "") {
    report("has no instructions after the frontmatter block");
  }
};

const run = () => {
  const problems = [];
  const skills = listSkills();
  if (skills.length === 0) {
    problems.push(`no ${SKILLS_DIRECTORY}/*/${SKILL_FILE} found`);
  }
  const newestRelease = findNewestRelease();
  if (newestRelease.problem) {
    problems.push(newestRelease.problem);
  }
  for (const skill of skills) {
    checkSkill(skill, newestRelease.version, problems);
  }

  if (problems.length > 0) {
    console.error(`validate-skills: ${problems.length} problem(s)`);
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    process.exit(1);
  }
  console.log(`validate-skills: ${skills.length} skill(s) OK`);
};

run();
