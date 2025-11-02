import i18n from "i18next";
import z from "zod";
import { addFileTypePlugin } from "./addFileTypePlugin";

const pluginManifestSchema = z.object({
  plugins: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
    }),
  ),
  translations: z.array(
    z.object({
      name: z.string(),
      localName: z.string(),
      lang: z.string(),
      path: z.string(),
      flag: z.string(),
    }),
  ),
});

type Manifest = z.infer<typeof pluginManifestSchema>;

type PluginEntry = Manifest["plugins"][number];
type TranslationEntry = Manifest["translations"][number];

async function loadPluginManifest(
  manifestUrl = "/manifest.json",
): Promise<Manifest> {
  try {
    const response = await fetch(manifestUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error("Failed to load plugin manifest");
    const manifest = await response.json();
    const parsed = pluginManifestSchema.parse(manifest);
    return parsed;
  } catch (error) {
    console.error("Error loading plugin manifest:", error);
    return {
      plugins: [],
      translations: [],
    };
  }
}

async function loadPlugin(plugin: PluginEntry) {
  try {
    const module = await import(/* @vite-ignore */ plugin.url);
    addFileTypePlugin(module.default);
    console.log(`Loaded plugin: ${plugin.name}`);
  } catch (error) {
    console.error(`Error loading plugin ${plugin.name}:`, error);
  }
}

async function loadTranslation(translation: TranslationEntry) {
  const response = await fetch(translation.path);
  if (!response.ok) throw new Error("Failed to load translation plugin");
  const language = await response.json();
  const langCode = translation.name;
  i18n.addResourceBundle(langCode, "translation", language, true, true);
  i18n.addResourceBundle("languages", "translation", {
    ["languages." + langCode]: {
      name: translation.name,
      localName: translation.localName,
      flag: translation.flag,
    },
  });
  console.log(`Loaded translation plugin: ${translation.name}`);
}

export async function loadExternalPlugins(manifestUrl = "/manifest.json") {
  const manifest = await loadPluginManifest(manifestUrl);
  // Load each plugin
  for (const plugin of manifest.plugins) {
    await loadPlugin(plugin);
  }

  for (const lang of manifest.translations) {
    await loadTranslation(lang);
  }
}
