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

// Function to add or remove /source from .gitignore
function toggleSourceInGitignore(add) {
  const gitignorePath = ".gitignore";
  let content = fs.readFileSync(gitignorePath, "utf8");
  const sourceEntry = "/source";

  if (add && !content.includes(sourceEntry)) {
    content += `\n${sourceEntry}`;
  } else if (!add) {
    content = content.replace(new RegExp(`^${sourceEntry}$`, "m"), "");
  }

  fs.writeFileSync(gitignorePath, content.trim() + "\n");
}

// Push to public repo
console.log("Pushing to public repo...");
toggleSourceInGitignore(true); // Add /source to .gitignore
runCommand("git add docs");
runCommand('git commit -m "Update docs"');
runCommand("git push origin main");

// Push to private repo
console.log("Pushing to private repo...");
toggleSourceInGitignore(false); // Remove /source from .gitignore

runCommand("git add .");
runCommand('git commit -m "Update all files including source"');
runCommand("git push private main");

// Restore .gitignore
toggleSourceInGitignore(true); // Add /source back to .gitignore

console.log("All operations completed successfully.");
