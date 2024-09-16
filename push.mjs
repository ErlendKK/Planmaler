import { execSync } from "child_process";

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

// Check and handle changes in 'docs' for public repo
if (hasChanges("docs")) {
  console.log("Staging changes in 'docs'...");
  runCommand("git add docs");

  console.log("Committing changes in 'docs'...");
  runCommand('git commit -m "Update docs"');

  console.log("Pushing 'docs' to public repo...");
  runCommand("git push origin main");
} else {
  console.log("No changes in 'docs' directory. Skipping public repo update.");
}

// Clear the staging area again
console.log("Clearing staging area...");
runCommand("git reset");

// Check and handle all changes for private repo
if (hasChanges(".")) {
  console.log("Staging all changes for private repo...");
  runCommand("git add .");

  console.log("Committing all changes for private repo...");
  runCommand('git commit -m "Update all files"');

  console.log("Pushing all changes to private repo...");
  runCommand("git push private main");
} else {
  console.log("No changes detected. Skipping private repo update.");
}

console.log("All operations completed successfully.");
