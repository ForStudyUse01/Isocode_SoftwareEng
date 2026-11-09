export const DEMO_PASSWORD = "Demo@1234";

export const DEMO_ACCOUNTS = {
  buyer: { email: "buyer@brandx-demo.test" },
  consultant: { email: "priya@brandx-demo.test" },
  admin: { email: "admin@brandx-demo.test" },
} as const;

export const demoLoginsOn = () => process.env.NEXT_PUBLIC_DEMO_LOGINS !== "off";
