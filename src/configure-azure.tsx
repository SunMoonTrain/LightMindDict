import {
  Action,
  ActionPanel,
  Form,
  Icon,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getAzureCreds, saveAzureCreds } from "./lib/azure-config";

export default function ConfigureAzure() {
  const [key, setKey] = useState("");
  const [region, setRegion] = useState("global");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const creds = await getAzureCreds();
      setKey(creds.key);
      setRegion(creds.region);
      setIsLoading(false);
    })();
  }, []);

  async function onSubmit() {
    await saveAzureCreds({
      key: key.trim(),
      region: region.trim() || "global",
    });
    await showToast({ style: Toast.Style.Success, title: "Azure 配置已保存" });
    await popToRoot();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="保存"
            icon={Icon.SaveDocument}
            onSubmit={onSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="key"
        title="Azure Key"
        value={key}
        onChange={setKey}
        placeholder="订阅密钥"
      />
      <Form.TextField
        id="region"
        title="Azure Region"
        value={region}
        onChange={setRegion}
        placeholder="如 eastasia / westus；全球资源填 global"
      />
      <Form.Description text="在 Azure 门户创建 Translator 资源后，可在 Keys and Endpoint 获取密钥与区域。免费 F0 层每月 2M 字符。" />
    </Form>
  );
}
