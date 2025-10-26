import type { NextConfig } from "next";
import { tr } from "zod/v4/locales";

const nextConfig: NextConfig = {
 eslint : {
  ignoreDuringBuilds : true,
 },
 typescript : {
  ignoreBuildErrors : true,
 }
};

export default nextConfig;
