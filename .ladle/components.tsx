import type { GlobalProvider } from "@ladle/react";
import React from "react";

import "./obsidian.css";

export const Provider: GlobalProvider = ({
    children,
    globalState,
    storyMeta,
}) => <div className={"body-styles theme-light"}>{children}</div>;
