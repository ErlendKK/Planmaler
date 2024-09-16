import { execSync } from "child_process";

function runCommand(command) {
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    process.exit(1);
  }
}

// Check for changes
runCommand("git status");

// Stage and commit docs for both repos
console.log("Staging changes in 'docs'...");
runCommand("git add docs");

console.log("Committing changes in 'docs'...");
runCommand('git commit -m "Update docs"');

console.log("Pushing 'docs' to public repo...");
runCommand("git push origin main");

// Stage and commit all changes (including source) for private repo
console.log("Staging all changes for private repo...");
runCommand("git add .");

console.log("Committing all changes for private repo...");
runCommand('git commit -m "Update all files"');

console.log("Pushing all changes to private repo...");
runCommand("git push private main");

console.log("All operations completed successfully.");
