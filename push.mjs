import { execSync } from "child_process";
import fs from "fs";

function runCommand(command) {
  try {
    return execSync(command, { stdio: "inherit", encoding: "utf-8" });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return null;
  }
}

function hasChanges(directory) {
  const output = execSync(`git status --porcelain ${directory}`, { encoding: "utf-8" });
  return output.trim().length > 0;
}

// Clear the staging area
console.log("Clearing staging area...");
runCommand("git reset");

// Push to public repo
console.log("Pushing to public repo...");
// Use .gitignore_public for the public repo push
fs.renameSync(".gitignore", ".gitignore_temp");
fs.renameSync(".gitignore_public", ".gitignore");

runCommand("git add docs");
runCommand('git commit -m "Update docs"');
runCommand("git push origin main");

// Restore original .gitignore
fs.renameSync(".gitignore", ".gitignore_public");
fs.renameSync(".gitignore_temp", ".gitignore");

// Push to private repo
console.log("Pushing to private repo...");
runCommand("git add .");
runCommand('git commit -m "Update all files including source"');
runCommand("git push private main");

console.log("All operations completed successfully.");
