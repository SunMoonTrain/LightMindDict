import { LocalStorage } from "@raycast/api";

const KEY = "azure.key";
const REGION = "azure.region";

export interface AzureCreds {
  key: string;
  region: string;
}

export async function getAzureCreds(): Promise<AzureCreds> {
  const [key, region] = await Promise.all([
    LocalStorage.getItem<string>(KEY),
    LocalStorage.getItem<string>(REGION),
  ]);
  return { key: key ?? "", region: region ?? "global" };
}

export async function saveAzureCreds(creds: AzureCreds): Promise<void> {
  await LocalStorage.setItem(KEY, creds.key);
  await LocalStorage.setItem(REGION, creds.region || "global");
}
