import translations from "./translations.yml";
import { t } from "plugin-api/beta/client/services";
import { createSettingsToggle } from "talk-plugin-notifications/client/api/factories";

const SettingsToggle = createSettingsToggle("onRejected", () =>
  t("talk-plugin-notifications-category-rejected.toggle_description")
);

export default {
  slots: {
    notificationSettings: [SettingsToggle]
  },
  translations
};
