// Adds the Kismet iMessage app: a Messages extension target (Swift/SwiftUI) embedded in the main app, so
// `npx expo prebuild --clean` reproduces it. ios/ is generated and never committed.
//
// - copies swift/*.swift and Assets.xcassets (iMessage App Icon + invite card) into ios/KismetMessages/
// - writes the extension's Info.plist (com.apple.message-payload-provider) and entitlements (shared keychain group)
// - adds the PBXNativeTarget with its build phases and settings, a dependency from the app target and an
//   "Embed App Extensions" copy phase on the app target
// - bundles the Fraunces serif from @expo-google-fonts/fraunces (registered at runtime in Fonts.swift)
// - Release builds for devices are signed manually with the App Store profiles named in `profiles`
const fs = require("fs");
const path = require("path");
const { withDangerousMod, withXcodeProject } = require("expo/config-plugins");

const TARGET = "KismetMessages";
const SRC = __dirname;

const q = (s) => JSON.stringify(String(s));

function infoPlist(p) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>${p.displayName}</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<key>KismetAPIURL</key>
	<string>${p.apiUrl}</string>
	<key>KismetAppURL</key>
	<string>${p.appUrl}</string>
	<key>KismetJoinURL</key>
	<string>${p.joinUrl}</string>
	<key>KismetKeychainGroup</key>
	<string>${p.teamId}.${p.keychainGroup}</string>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.message-payload-provider</string>
		<key>NSExtensionPrincipalClass</key>
		<string>$(PRODUCT_MODULE_NAME).MessagesViewController</string>
	</dict>
</dict>
</plist>
`;
}

function entitlements(groups) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>keychain-access-groups</key>
	<array>
${groups.map((g) => `		<string>${g}</string>`).join("\n")}
	</array>
</dict>
</plist>
`;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name);
    const b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

// Fraunces (the app's serif), copied from @expo-google-fonts/fraunces into the extension bundle.
const FONTS = ["400Regular/Fraunces_400Regular.ttf", "600SemiBold/Fraunces_600SemiBold.ttf"];
const fontFile = (f) => path.basename(f);

const swiftFiles = () => fs.readdirSync(path.join(SRC, "swift")).filter((f) => f.endsWith(".swift")).sort();

const withFiles = (config, props) =>
  withDangerousMod(config, [
    "ios",
    (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, TARGET);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      for (const f of swiftFiles()) fs.copyFileSync(path.join(SRC, "swift", f), path.join(dir, f));
      copyDir(path.join(SRC, "Assets.xcassets"), path.join(dir, "Assets.xcassets"));
      const fonts = path.dirname(require.resolve("@expo-google-fonts/fraunces/package.json", { paths: [cfg.modRequest.projectRoot] }));
      for (const f of FONTS) fs.copyFileSync(path.join(fonts, f), path.join(dir, fontFile(f)));
      fs.writeFileSync(path.join(dir, "Info.plist"), infoPlist(props));
      fs.writeFileSync(path.join(dir, `${TARGET}.entitlements`), entitlements([`$(AppIdentifierPrefix)${props.keychainGroup}`]));
      return cfg;
    },
  ]);

function buildSettingsOf(project, target) {
  const list = project.pbxXCConfigurationList()[target.buildConfigurationList];
  const configs = project.pbxXCBuildConfigurationSection();
  return list.buildConfigurations.map((c) => configs[c.value]);
}

const withTarget = (config, props) =>
  withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const objects = project.hash.project.objects;
    const nativeTargets = project.pbxNativeTargetSection();
    if (Object.keys(nativeTargets).some((k) => !k.endsWith("_comment") && nativeTargets[k].name?.replace(/"/g, "") === TARGET)) return cfg;

    const main = project.getFirstTarget();
    const mainConfigs = buildSettingsOf(project, main.firstTarget);
    const deploymentTarget = mainConfigs[0].buildSettings.IPHONEOS_DEPLOYMENT_TARGET || "16.4";
    const version = cfg.version || "1.0.0";
    const build = cfg.ios?.buildNumber || "1";
    const id = () => project.generateUuid();
    const section = (name) => (objects[name] = objects[name] || {});
    const put = (sec, uuid, obj, comment) => {
      section(sec)[uuid] = obj;
      section(sec)[`${uuid}_comment`] = comment;
    };

    // File references + group
    const fileRef = (name, type) => {
      const uuid = id();
      put("PBXFileReference", uuid, { isa: "PBXFileReference", lastKnownFileType: type, path: q(name), sourceTree: q("<group>") }, name);
      return uuid;
    };
    const swift = swiftFiles().map((f) => ({ name: f, ref: fileRef(f, "sourcecode.swift") }));
    const assets = { name: "Assets.xcassets", ref: fileRef("Assets.xcassets", "folder.assetcatalog") };
    const fonts = FONTS.map((f) => ({ name: fontFile(f), ref: fileRef(fontFile(f), "file") }));
    const plist = { name: "Info.plist", ref: fileRef("Info.plist", "text.plist.xml") };
    const ents = { name: `${TARGET}.entitlements`, ref: fileRef(`${TARGET}.entitlements`, "text.plist.entitlements") };

    const productRef = id();
    put(
      "PBXFileReference",
      productRef,
      { isa: "PBXFileReference", explicitFileType: q("wrapper.app-extension"), includeInIndex: 0, path: q(`${TARGET}.appex`), sourceTree: "BUILT_PRODUCTS_DIR" },
      `${TARGET}.appex`,
    );

    const groupId = id();
    put(
      "PBXGroup",
      groupId,
      {
        isa: "PBXGroup",
        children: [...swift, assets, ...fonts, plist, ents].map((f) => ({ value: f.ref, comment: f.name })),
        path: TARGET,
        sourceTree: q("<group>"),
      },
      TARGET,
    );
    const mainGroup = objects.PBXGroup[project.getFirstProject().firstProject.mainGroup];
    mainGroup.children.push({ value: groupId, comment: TARGET });
    const products = project.pbxGroupByName("Products");
    products.children.push({ value: productRef, comment: `${TARGET}.appex` });

    // Build phases of the extension
    const buildFile = (ref, name, phase, settings) => {
      const uuid = id();
      put("PBXBuildFile", uuid, { isa: "PBXBuildFile", fileRef: ref, fileRef_comment: name, ...(settings ? { settings } : {}) }, `${name} in ${phase}`);
      return { value: uuid, comment: `${name} in ${phase}` };
    };
    const phase = (isa, name, files, extra = {}) => {
      const uuid = id();
      put(isa, uuid, { isa, buildActionMask: 2147483647, files, runOnlyForDeploymentPostprocessing: 0, ...extra }, name);
      return { value: uuid, comment: name };
    };
    const sources = phase("PBXSourcesBuildPhase", "Sources", swift.map((f) => buildFile(f.ref, f.name, "Sources")));
    const frameworks = phase("PBXFrameworksBuildPhase", "Frameworks", []);
    const resources = phase("PBXResourcesBuildPhase", "Resources", [assets, ...fonts].map((f) => buildFile(f.ref, f.name, "Resources")));

    // Build configurations
    const common = {
      ASSETCATALOG_COMPILER_APPICON_NAME: q("iMessage App Icon"),
      ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS: "NO",
      CLANG_ENABLE_MODULES: "YES",
      CODE_SIGN_ENTITLEMENTS: q(`${TARGET}/${TARGET}.entitlements`),
      CURRENT_PROJECT_VERSION: q(build),
      DEVELOPMENT_TEAM: props.teamId,
      GENERATE_INFOPLIST_FILE: "NO",
      INFOPLIST_FILE: q(`${TARGET}/Info.plist`),
      IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,
      LD_RUNPATH_SEARCH_PATHS: q("$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"),
      MARKETING_VERSION: q(version),
      PRODUCT_BUNDLE_IDENTIFIER: q(props.bundleIdentifier),
      PRODUCT_NAME: q("$(TARGET_NAME)"),
      SDKROOT: "iphoneos",
      SKIP_INSTALL: "YES",
      SWIFT_EMIT_LOC_STRINGS: "YES",
      SWIFT_VERSION: "5.0",
      TARGETED_DEVICE_FAMILY: q("1"),
    };
    const release = {
      ...common,
      CODE_SIGN_STYLE: "Manual",
      [q("CODE_SIGN_IDENTITY[sdk=iphoneos*]")]: q("iPhone Distribution"),
      [q("PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]")]: q(props.profiles.extension),
      SWIFT_COMPILATION_MODE: "wholemodule",
      SWIFT_OPTIMIZATION_LEVEL: q("-O"),
    };
    const debug = {
      ...common,
      CODE_SIGN_STYLE: "Automatic",
      DEBUG_INFORMATION_FORMAT: "dwarf",
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: q("DEBUG $(inherited)"),
      SWIFT_OPTIMIZATION_LEVEL: q("-Onone"),
    };
    const configIds = [
      ["Debug", debug],
      ["Release", release],
    ].map(([name, buildSettings]) => {
      const uuid = id();
      put("XCBuildConfiguration", uuid, { isa: "XCBuildConfiguration", buildSettings, name }, name);
      return { value: uuid, comment: name };
    });
    const listId = id();
    put(
      "XCConfigurationList",
      listId,
      { isa: "XCConfigurationList", buildConfigurations: configIds, defaultConfigurationIsVisible: 0, defaultConfigurationName: "Release" },
      `Build configuration list for PBXNativeTarget "${TARGET}"`,
    );

    // The target
    const targetId = id();
    put(
      "PBXNativeTarget",
      targetId,
      {
        isa: "PBXNativeTarget",
        buildConfigurationList: listId,
        buildConfigurationList_comment: `Build configuration list for PBXNativeTarget "${TARGET}"`,
        buildPhases: [sources, frameworks, resources],
        buildRules: [],
        dependencies: [],
        name: TARGET,
        productName: TARGET,
        productReference: productRef,
        productReference_comment: `${TARGET}.appex`,
        productType: q("com.apple.product-type.app-extension.messages"),
      },
      TARGET,
    );
    const pbxProject = project.getFirstProject().firstProject;
    pbxProject.targets.push({ value: targetId, comment: TARGET });
    pbxProject.attributes.TargetAttributes = pbxProject.attributes.TargetAttributes || {};
    pbxProject.attributes.TargetAttributes[targetId] = { CreatedOnToolsVersion: "16.0", DevelopmentTeam: props.teamId };

    // App target: depends on the extension and embeds it
    const proxyId = id();
    put(
      "PBXContainerItemProxy",
      proxyId,
      {
        isa: "PBXContainerItemProxy",
        containerPortal: project.hash.project.rootObject,
        containerPortal_comment: "Project object",
        proxyType: 1,
        remoteGlobalIDString: targetId,
        remoteInfo: TARGET,
      },
      "PBXContainerItemProxy",
    );
    const depId = id();
    put("PBXTargetDependency", depId, { isa: "PBXTargetDependency", target: targetId, target_comment: TARGET, targetProxy: proxyId, targetProxy_comment: "PBXContainerItemProxy" }, "PBXTargetDependency");
    main.firstTarget.dependencies = main.firstTarget.dependencies || [];
    main.firstTarget.dependencies.push({ value: depId, comment: "PBXTargetDependency" });

    const embed = phase(
      "PBXCopyFilesBuildPhase",
      "Embed App Extensions",
      [buildFile(productRef, `${TARGET}.appex`, "Embed App Extensions", { ATTRIBUTES: ["RemoveHeadersOnCopy"] })],
      { dstPath: q(""), dstSubfolderSpec: 13, name: q("Embed App Extensions") },
    );
    // Right after Resources, ahead of the React Native / CocoaPods script phases (avoids build-cycle errors).
    const phases = main.firstTarget.buildPhases;
    const after = phases.findIndex((b) => b.comment === "Resources");
    phases.splice(after >= 0 ? after + 1 : phases.length, 0, embed);

    // App target: manual App Store signing for device Release builds (archives); Debug stays automatic.
    for (const c of mainConfigs) {
      c.buildSettings.DEVELOPMENT_TEAM = props.teamId;
      if (c.name === "Release") {
        c.buildSettings.CODE_SIGN_STYLE = "Manual";
        c.buildSettings[q("CODE_SIGN_IDENTITY[sdk=iphoneos*]")] = q("iPhone Distribution");
        c.buildSettings[q("PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]")] = q(props.profiles.app);
      }
    }
    return cfg;
  });

module.exports = function withMessagesExtension(config, props = {}) {
  const p = {
    bundleIdentifier: props.bundleIdentifier || `${config.ios?.bundleIdentifier}.messages`,
    displayName: props.displayName || config.name,
    teamId: props.teamId,
    keychainGroup: props.keychainGroup,
    apiUrl: props.apiUrl || "https://agent-dates.vercel.app",
    joinUrl: props.joinUrl || "https://kismet-village.vercel.app/app/join", // the sign-up without the village's own name
    appUrl: props.appUrl || "kismet://",
    profiles: { app: "Kismet App Store", extension: "Kismet Messages App Store", ...(props.profiles || {}) },
  };
  if (!p.teamId || !p.keychainGroup) throw new Error("with-messages-extension needs teamId and keychainGroup");
  config = withFiles(config, p);
  return withTarget(config, p);
};
