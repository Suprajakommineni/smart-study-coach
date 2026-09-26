import { useEffect, useRef, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { searchAll } from "../api/searchapi";

type TopbarProps = {
  onMenuClick: () => void;
};

type SearchResult = {
  type: "concept" | "question";
  id: number;
  title: string;
  text?: string;
};
type ConceptSearchResult = {
  id: number;
  title: string;
  definition: string;
};

type QuestionSearchResult = {
  id: number;
  text: string;
  answer: string;
};

type SearchResponse = {
  concepts: ConceptSearchResult[];
  questions: QuestionSearchResult[];
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const navigate = useNavigate();

  const email = localStorage.getItem("email");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  /* Search */
  useEffect(() => {
    if (!query.trim()) return;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        const data = await searchAll(query.trim());

        console.log("Search response:", data);

        const searchData = data as SearchResponse;

const searchResults: SearchResult[] = [
  ...(searchData.concepts || []).map((concept) => ({
    type: "concept" as const,
    id: concept.id,
    title: concept.title,
    text: concept.definition,
  })),

  ...(searchData.questions || []).map((question) => ({
    type: "question" as const,
    id: question.id,
    title: question.text,
    text: question.answer,
  })),
];

        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  /* Close search when clicking outside */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSearchOpen(false);
  };

  const handleResultClick = (result: SearchResult) => {
    setSearchOpen(false);

    if (result.type === "question") {
      navigate(`/modules/${result.id}/questions`);
    }

    /*
      Concepts don't currently have a simple global route
      because concepts belong to a source.

      So for now we only close the search result.
      We can add concept navigation later if needed.
    */
  };

  return (
    <header
      className="
        sticky top-0 z-30
        flex h-16 w-full items-center
        gap-3
        border-b border-gray-200
        bg-white
        px-4 sm:px-6
        lg:pl-6
      "
    >
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="
          flex shrink-0 items-center justify-center
          rounded-lg p-2
          text-gray-600
          hover:bg-gray-100
          lg:hidden
        "
      >
        <Menu size={22} />
      </button>

      {/* Search */}
      <div
        ref={searchRef}
        className="relative min-w-0 flex-1 max-w-2xl"
      >
        <div className="relative">
          <Search
            size={18}
            className="
              absolute left-3 top-1/2
              -translate-y-1/2
              text-gray-400
            "
          />

          <input
            type="text"
            value={query}
            placeholder="Search concepts and questions..."
            onFocus={() => {
              if (query.trim()) {
                setSearchOpen(true);
              }
            }}
            onChange={(event) => {
              const value = event.target.value;

              setQuery(value);
              setSearchOpen(true);

              if (!value.trim()) {
                setResults([]);
                setLoading(false);
              }
            }}
            className="
              h-10 w-full
              rounded-xl
              border border-gray-200
              bg-gray-50
              pl-10 pr-10
              text-sm
              text-gray-800
              outline-none
              transition
              placeholder:text-gray-400
              focus:border-gray-300
              focus:bg-white
              focus:ring-2
              focus:ring-gray-100
            "
          />

          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="
                absolute right-3 top-1/2
                -translate-y-1/2
                text-gray-400
                hover:text-gray-700
              "
            >
              <X size={17} />
            </button>
          )}
        </div>

        {/* Search dropdown */}
        {searchOpen && query.trim() && (
          <div
            className="
              absolute left-0 right-0 top-12
              z-50
              max-h-[70vh]
              overflow-y-auto
              rounded-xl
              border border-gray-200
              bg-white
              shadow-lg
            "
          >
            {loading && (
              <div className="px-4 py-4 text-sm text-gray-500">
                Searching...
              </div>
            )}

            {!loading && results.length === 0 && (
              <div className="px-4 py-4 text-sm text-gray-500">
                No results found.
              </div>
            )}

            {!loading &&
              results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onClick={() => handleResultClick(result)}
                  className="
                    block w-full
                    border-b border-gray-100
                    px-4 py-3
                    text-left
                    transition
                    last:border-b-0
                    hover:bg-gray-50
                  "
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`
                        rounded-md px-2 py-1
                        text-[10px] font-semibold uppercase
                        ${
                          result.type === "concept"
                            ? "bg-violet-100 text-violet-700"
                            : "bg-blue-100 text-blue-700"
                        }
                      `}
                    >
                      {result.type}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm font-medium text-gray-800">
                    {result.title}
                  </p>

                  {result.text && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                      {result.text}
                    </p>
                  )}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* User */}
      {/* User */}
<div className="ml-auto hidden max-w-180px truncate text-sm font-medium text-gray-700 sm:flex">
  {email || "User"}
</div>
    </header>
  );
}