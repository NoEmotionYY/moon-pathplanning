///|
/// Thin linker entry point. Validation, serialization and planning logic stay
/// in the independently testable web_bridge package.
pub fn plan_json(input : String) -> String {
  @bridge.plan_json(input)
}

///|
fn main {

}
