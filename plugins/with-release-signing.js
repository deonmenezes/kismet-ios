// Signs Android release builds with the upload key in secrets/keystore.properties (git-ignored) when that
// file exists; otherwise release builds keep the debug key so a fresh clone still builds.
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// agent-dates: release signing";

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    src = src.replace(
      /signingConfigs \{\n/,
      `signingConfigs {
        ${MARKER}
        def uploadProps = new Properties()
        def uploadFile = rootProject.file("../secrets/keystore.properties")
        if (uploadFile.exists()) uploadFile.withInputStream { uploadProps.load(it) }
        if (uploadProps["storeFile"]) {
            release {
                storeFile rootProject.file("../secrets/" + uploadProps["storeFile"])
                storePassword uploadProps["storePassword"]
                keyAlias uploadProps["keyAlias"]
                keyPassword uploadProps["keyPassword"]
            }
        }
`,
    );
    src = src.replace(
      /(release \{\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/,
      "$1signingConfig signingConfigs.findByName('release') ?: signingConfigs.debug",
    );
    cfg.modResults.contents = src;
    return cfg;
  });
};
