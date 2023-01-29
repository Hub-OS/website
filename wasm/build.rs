use std::process::Command;

fn main() {
    let build_output = Command::new("cargo")
        .args(["license", "--json"])
        .stderr(std::process::Stdio::inherit())
        .output()
        .unwrap();

    std::fs::write("licenses.json", build_output.stdout).unwrap();
}
