const { withGradleProperties, withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// Palavra Viva: limit native build concurrency to avoid compiler OOM.';
const NATIVE_BUILD_LIMITS = `
${MARKER}
subprojects { subproject ->
    ['com.android.application', 'com.android.library'].each { androidPlugin ->
        subproject.plugins.withId(androidPlugin) {
            subproject.extensions.getByName('android').defaultConfig.externalNativeBuild.cmake.arguments.addAll([
                '-DCMAKE_JOB_POOLS=compile_pool=2;link_pool=1',
                '-DCMAKE_JOB_POOL_COMPILE=compile_pool',
                '-DCMAKE_JOB_POOL_LINK=link_pool'
            ])
        }
    }
}
`;

/** Keep the memory limits when Expo regenerates the ignored android directory. */
module.exports = function withAndroidBuildLimits(config) {
  config = withGradleProperties(config, (mod) => {
    for (const [key, value] of Object.entries({
      'org.gradle.workers.max': '2',
      'org.gradle.parallel': 'false',
    })) {
      mod.modResults = mod.modResults.filter((entry) => entry.type !== 'property' || entry.key !== key);
      mod.modResults.push({ type: 'property', key, value });
    }
    return mod;
  });
  return withProjectBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(MARKER)) {
      // Register before the root plugins, which can evaluate the app eagerly.
      const rootPlugin = 'apply plugin: "expo-root-project"';
      mod.modResults.contents = mod.modResults.contents.includes(rootPlugin)
        ? mod.modResults.contents.replace(rootPlugin, NATIVE_BUILD_LIMITS + '\n' + rootPlugin)
        : NATIVE_BUILD_LIMITS + mod.modResults.contents;
    }
    return mod;
  });
};
