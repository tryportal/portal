"use client";

import { CustomizationSettings } from "@/components/preview/customization-settings";
import { usePageTitle } from "@/lib/use-page-title";

export default function CustomizationSettingsPage() {
    usePageTitle("Customization - Portal");

    return <CustomizationSettings />;
}
