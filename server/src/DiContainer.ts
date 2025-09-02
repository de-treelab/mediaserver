import { ContainerBuilder } from "node-dependency-injection";
import { defaultDiContainer } from "./DefaultDiContainer.js";

export const DI_CONTAINER = new ContainerBuilder();

export const setupDiContainer = async () => {
  defaultDiContainer(DI_CONTAINER);

  if (process.env.CI) {
    // override with test doubles
  }

  await DI_CONTAINER.compile();
  return DI_CONTAINER;
};
