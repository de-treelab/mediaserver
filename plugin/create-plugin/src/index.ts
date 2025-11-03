#!/usr/bin/env node
import * as readline from "readline";
import * as fs from "fs/promises";
import { exec } from "child_process";

const frontendTsConfig = {
  compilerOptions: {
    target: "ES2023",
    lib: ["ES2023", "DOM"],
    module: "ESNext",
    skipLibCheck: true,

    /* Bundler mode */
    moduleResolution: "bundler",
    //"allowImportingTsExtensions": true,
    verbatimModuleSyntax: true,
    moduleDetection: "force",
    noEmit: false,
    outDir: "dist",

    /* Linting */
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    erasableSyntaxOnly: true,
    noFallthroughCasesInSwitch: true,
    noUncheckedSideEffectImports: true,
  },
};

const backendTsConfig = {
  compilerOptions: {
    target: "ES2023",
    lib: ["ES2023"],
    types: ["node"],
    module: "nodenext",
    skipLibCheck: true,
    outDir: "dist",
    moduleResolution: "nodenext",

    /* Linting */
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    erasableSyntaxOnly: true,
    noFallthroughCasesInSwitch: true,
    noUncheckedSideEffectImports: true,
  },
};

const backendDependencies = [
  "@types/node",
  "typescript",
  "@lars_hagemann/mediaserver-backend-plugin-types",
];

const frontendDependencies = [
  "typescript",
  "@types/react",
  "@types/react-dom",
  "@lars_hagemann/mediaserver-frontend-plugin-types",
];

const backendSkeleton = `
import { FileTypePlugin } from "@lars_hagemann/mediaserver-backend-plugin-types";

export const plugin: FileTypePlugin = {
  matcher: (file) => /* Your implementation here */ false,
  thumbnailCreator: async (context) => {
    throw new Error("Not implemented");
  },
};

export default plugin;
`;

const frontendSkeleton = `
import type { FileTypePlugin } from "@lars_hagemann/mediaserver-frontend-plugin-types";

const plugin: FileTypePlugin = {
  matcher: (fileType) => /* Your implementation here */ false,
  icon: (ReactIcons) => /* Your implementation here */ ReactIcons.FaFile,
  Render: (context) => {
    context.React.useEffect(() => {
      console.log("This worked!");
    }, []);

    return context.React.createElement("iframe", {
      className: "w-full h-full",
      src: context.objectUrl,
    });
  },
  Diashow: () => null,
  description: "Your plugin description here",
};

export default plugin;
`;

const config = {
  frontend: {
    tsConfig: frontendTsConfig,
    dependencies: frontendDependencies,
    skeleton: frontendSkeleton,
  },
  backend: {
    tsConfig: backendTsConfig,
    dependencies: backendDependencies,
    skeleton: backendSkeleton,
  },
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const questionOrDefault = async (
  query: string,
  defaultValue: string
): Promise<string> => {
  const answer = await question(`${query} (default: ${defaultValue}): `);
  return answer.trim() === "" ? defaultValue : answer.trim();
};

const validatePluginType = (type: string): boolean => {
  const validTypes = ["frontend", "backend"];
  return validTypes.includes(type.toLowerCase());
};

async function main() {
  const folderPath = await questionOrDefault(
    "Enter the plugin folder path",
    "."
  );
  let pluginType = "";
  while (true) {
    const inputType = await questionOrDefault(
      "Enter the plugin type (frontend/backend)",
      "frontend"
    );
    if (validatePluginType(inputType)) {
      pluginType = inputType.toLowerCase();
      break;
    } else {
      console.log("Invalid plugin type. Please enter 'frontend' or 'backend'.");
    }
  }
  const pluginName = await questionOrDefault(
    "Enter the plugin name",
    "my-plugin"
  );
  const authorName = await questionOrDefault(
    "Enter the author name",
    "Your Name"
  );

  console.log("\nPlugin Configuration:");
  console.log(`Folder Path: ${folderPath}`);
  console.log(`Plugin Type: ${pluginType}`);
  console.log(`Plugin Name: ${pluginName}`);
  console.log(`Author Name: ${authorName}`);

  const validate = await questionOrDefault("Create plugin? (yes/no)", "yes");

  rl.close();

  if (validate.toLowerCase() !== "yes") {
    console.log("Plugin creation cancelled.");
    return;
  }

  const pluginFolderPath = folderPath;
  const pluginSrcPath = `${pluginFolderPath}/src`;
  await fs.mkdir(pluginFolderPath, { recursive: true });
  await fs.mkdir(pluginSrcPath, { recursive: true });
  process.chdir(pluginFolderPath);

  const packageJsonContent = {
    name: `${pluginName}`,
    scripts: {
      build: "tsc",
    },
  };

  console.log("Writing package.json");
  await fs.writeFile(
    `${pluginFolderPath}/package.json`,
    JSON.stringify(packageJsonContent, null, 2)
  );

  const pluginConfig = config[pluginType];

  const tsConfigContent = pluginConfig.tsConfig;

  console.log("Writing tsconfig.json");
  await fs.writeFile(
    `${pluginFolderPath}/tsconfig.json`,
    JSON.stringify(tsConfigContent, null, 2)
  );

  console.log("Installing dependencies...");
  await new Promise((resolve, reject) => {
    exec(
      `npm i -D ${pluginConfig.dependencies.join(" ")}`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error installing dependencies: ${error.message}`);
          reject(error);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        resolve(null);
      }
    );
  });

  console.log("Writing skeleton plugin file...");
  const pluginFileName = "index.ts";
  await fs.writeFile(
    `${pluginSrcPath}/${pluginFileName}`,
    pluginConfig.skeleton
  );

  console.log("Plugin created successfully.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
