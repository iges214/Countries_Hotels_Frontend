import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import { HotelProvider } from "./context";
import { SiteLoading } from "./SiteLoading";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/playfair-display/wght-italic.css";
import "./styles.css";
const router = createBrowserRouter([
  {
    path: "*",
    element: (
      <HotelProvider>
        <SiteLoading>
          <App />
        </SiteLoading>
      </HotelProvider>
    ),
  },
]);
createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
