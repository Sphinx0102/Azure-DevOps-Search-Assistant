import { useEffect, useState } from "react";
import SearchBuilderPage from "./pages/SearchBuilderPage";
import WikiPage from "./pages/WikiPage";

const ROUTES = {
  SEARCH: "/",
  WIKI: "/wiki",
};

function normalizePath(pathname = "") {
  const cleanPath = pathname.toLowerCase().replace(/\/+$/, "") || "/";

  if (cleanPath === ROUTES.WIKI) {
    return ROUTES.WIKI;
  }

  return ROUTES.SEARCH;
}

function App() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => {
      setPath(normalizePath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (nextPath) => {
    const targetPath = normalizePath(nextPath);
    const currentPath = normalizePath(window.location.pathname);

    if (targetPath !== currentPath) {
      window.history.pushState({}, "", targetPath);
    }

    setPath(targetPath);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  if (path === ROUTES.WIKI) {
    return <WikiPage navigate={navigate} />;
  }

  return <SearchBuilderPage navigate={navigate} />;
}

export default App;
