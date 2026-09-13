import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CourseCard from "../components/content/CourseCard";
import MobilePageShell from "../components/layout/MobilePageShell";
import { allContent } from "../data/content";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim();

  const results = useMemo(() => {
    if (!query) return [];
    const keyword = query.toLowerCase();
    return allContent.filter((content) => {
      const haystack = [content.title, content.subtitle, content.description, content.detailDescription]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [query]);

  return (
    <MobilePageShell mainClassName="member-page search-page">
      <header className="member-page-header">
        <h1>검색</h1>
        <p>{query ? `"${query}" 검색 결과` : "찾고 싶은 콘텐츠를 검색해 보세요."}</p>
      </header>

      {!query ? (
        <section className="member-empty-state">
          <strong>검색어를 입력해 주세요.</strong>
          <p>상단 검색창에서 영어, 수학, 수준 등으로 찾아볼 수 있어요.</p>
        </section>
      ) : results.length === 0 ? (
        <section className="member-empty-state">
          <strong>검색 결과가 없어요.</strong>
          <p>다른 키워드로 다시 검색해 보거나 콘텐츠 목록을 둘러보세요.</p>
          <Link className="subscription-empty-link" to="/#content-catalog">
            콘텐츠 둘러보기
          </Link>
        </section>
      ) : (
        <section className="search-results">
          <p className="search-results-count">{results.length}개 콘텐츠</p>
          <div className="content-stack">
            {results.map((content) => (
              <CourseCard content={content} key={content.slug} />
            ))}
          </div>
        </section>
      )}
    </MobilePageShell>
  );
}
