// ==UserScript==
// @name         影评聚合
// @name:en      Movie Ratings
// @name:zh-CN   影评聚合
// @namespace    https://github.com/x-ww/MovieRatingIntegrator
// @version      1.5.6
// @description  在豆瓣/IMDb聚合显示多平台评分（IMDb、豆瓣、烂番茄、Metacritic）
// @description:en  Aggregate movie ratings from IMDb, Douban, Rotten Tomatoes & Metacritic on Douban/IMDb
// @description:zh-CN  在豆瓣/IMDb聚合显示多平台评分（IMDb、豆瓣、烂番茄、Metacritic）
// @author       x-ww
// @match        *://movie.douban.com/subject/*
// @match        *://www.douban.com/personage/*
// @match        *://www.imdb.com/title/*
// @connect      api.douban.com
// @connect      movie.douban.com
// @connect      www.omdbapi.com
// @connect      p.media-imdb.com
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @homepageURL  https://github.com/x-ww/MovieRatingIntegrator
// @supportURL   https://github.com/x-ww/MovieRatingIntegrator/issues
// @updateURL    https://raw.githubusercontent.com/x-ww/Scripts/main/MovieRatingIntegrator/MovieRatingIntegrator.js
// @downloadURL  https://raw.githubusercontent.com/x-ww/Scripts/main/MovieRatingIntegrator/MovieRatingIntegrator.js
// @noframes
// @run-at       document-end
// ==/UserScript==
"use strict";

(() => {
  const GM_REQUEST =
    typeof GM !== "undefined" && GM?.xmlHttpRequest
      ? GM.xmlHttpRequest
      : typeof GM_xmlhttpRequest !== "undefined"
        ? GM_xmlhttpRequest
        : null;
  const OMDB_KEYS = [
    "40700ff1",
    "4ee790e0",
    "d82cb888",
    "386234f9",
    "d58193b6",
    "15c0aa3f",
  ];
  const DB_HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded; charset=utf8",
  };
  // 以 POST body 方式发送，gmJson 内部对带 data 的请求不做缓存（认证请求不宜缓存）
  const DB_KEY = "apikey=0ab215a8b1977939201640fa14c66bab";
  const IMDB_TOP_STYLE_ID = "movie-rating-integrator-top250-style";
  const DOUBAN_RECOVERED_TITLE = "Rating recovered by script.";
  const host = location.hostname;

  // 原脚本这里是 base64 编码的图标，文件被截断后已损坏，改用 emoji 代替
  const TOMATO_ICON_FRESH = "🍅";
  const TOMATO_ICON_ROTTEN = "🟢";
  const TOMATO_USER_ICON_POSITIVE = "🍿";
  const TOMATO_USER_ICON_NEGATIVE = "💤";

  const isNA = (value) => value == null || value === "" || value === "N/A";
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [
    ...root.querySelectorAll(selector),
  ];

  // ─── 缓存配置（使用 GM_setValue/GM_getValue，跨域统一存储）───
  const CACHE_KEY = "movie-rating-integrator-cache";
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时
  const CACHE_MAX_SIZE = 100;
  const CACHE_EVICT_COUNT = 10; // 超出上限时批量淘汰最旧的条数

  function getCached(key) {
    try {
      const cache = JSON.parse(GM_getValue(CACHE_KEY, "{}"));
      const entry = cache[key];
      if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.data;
      }
    } catch {}
    return null;
  }

  function setCache(key, data) {
    try {
      const cache = JSON.parse(GM_getValue(CACHE_KEY, "{}"));
      cache[key] = { data, timestamp: Date.now() };

      const keys = Object.keys(cache);
      if (keys.length > CACHE_MAX_SIZE) {
        // 批量淘汰最旧的 CACHE_EVICT_COUNT 条，避免每次写入都只删一条
        keys
          .sort((a, b) => cache[a].timestamp - cache[b].timestamp)
          .slice(0, CACHE_EVICT_COUNT)
          .forEach((k) => delete cache[k]);
      }

      GM_setValue(CACHE_KEY, JSON.stringify(cache));
    } catch {}
  }

  function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(url) {
    if (!url) return "";
    try {
      const parsed = new URL(url, location.href);
      return /^https?:$/.test(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  }

  // 用于存储活跃的 observer，以便页面卸载时清理
  const activeObservers = [];

  // ─── 网络请求 ───

  /**
   * 单次请求，返回 { text, shouldRetry }
   * - 网络错误 / 5xx：shouldRetry = true
   * - 4xx 及其他客户端错误：shouldRetry = false（重试无意义）
   */
  function gmRequestSingle(url, headers, data) {
    return new Promise((resolve) => {
      if (!GM_REQUEST) {
        console.error("GM.xmlHttpRequest is unavailable.");
        resolve({ text: undefined, shouldRetry: false });
        return;
      }

      GM_REQUEST({
        method: data ? "POST" : "GET",
        url,
        headers,
        data,
        onload: (response) => {
          if (response.status >= 200 && response.status < 400) {
            resolve({ text: response.responseText, shouldRetry: false });
            return;
          }
          // 5xx 服务端错误可重试；4xx 客户端错误无需重试
          const shouldRetry = response.status >= 500;
          console.error(
            `Error ${url}:`,
            response.status,
            response.responseText,
          );
          resolve({ text: undefined, shouldRetry });
        },
        onerror: (response) => {
          // 网络层错误（DNS、超时等），值得重试
          console.error(`GM error ${url}:`, response.statusText || response);
          resolve({ text: undefined, shouldRetry: true });
        },
      });
    });
  }

  async function gmRequest(url, headers, data, retries = 3) {
    for (let i = 0; i < retries; i++) {
      const { text, shouldRetry } = await gmRequestSingle(url, headers, data);
      if (text !== undefined) return text;
      if (!shouldRetry) return undefined; // 4xx：不重试，直接放弃
      if (i < retries - 1) {
        const delay = 1000 * (i + 1);
        console.warn(`Retry ${i + 1}/${retries} for ${url} after ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    return undefined;
  }

  async function gmJson(url, headers, data) {
    // 仅对 GET（无 data）请求做缓存
    const cacheKey = url;
    if (!data) {
      const cached = getCached(cacheKey);
      if (cached !== null) {
        console.log(`[Cache hit] ${url}`);
        return cached;
      }
    }

    const text = await gmRequest(url, headers, data);
    if (!text) return undefined;

    try {
      const result = JSON.parse(text);
      if (!data && result) {
        setCache(cacheKey, result);
      }
      return result;
    } catch (error) {
      console.error(`JSON parse ${url}:`, error);
      return undefined;
    }
  }

  async function gmJsonp(url, headers, data) {
    const text = await gmRequest(url, headers, data);
    if (!text) return undefined;

    try {
      const match = text.match(/^[^(]+\(([\s\S]+)\)\s*;?\s*$/);
      return match ? JSON.parse(match[1]) : undefined;
    } catch (error) {
      console.error(`JSONP parse ${url}:`, error);
      return undefined;
    }
  }

  function waitForElement(selector, timeout = 8000) {
    return new Promise((resolve) => {
      const existing = qs(selector);
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const node = qs(selector);
        if (node) {
          observer.disconnect();
          const idx = activeObservers.indexOf(observer);
          if (idx !== -1) activeObservers.splice(idx, 1);
          resolve(node);
        }
      });

      activeObservers.push(observer);

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        const idx = activeObservers.indexOf(observer);
        if (idx !== -1) activeObservers.splice(idx, 1);
        // 超时后仍尝试一次同步查询，找不到则 resolve(null)
        resolve(qs(selector) ?? null);
      }, timeout);
    });
  }

  // 同时等待多个候选选择器，命中任意一个即返回（应对 IMDb 改版后的多种结构）
  function waitForAny(selectors, timeout = 10000) {
    return new Promise((resolve) => {
      const find = () => {
        for (const sel of selectors) {
          const node = qs(sel);
          if (node) return node;
        }
        return null;
      };
      const existing = find();
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const node = find();
        if (node) {
          observer.disconnect();
          const idx = activeObservers.indexOf(observer);
          if (idx !== -1) activeObservers.splice(idx, 1);
          resolve(node);
        }
      });
      activeObservers.push(observer);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
      setTimeout(() => {
        observer.disconnect();
        const idx = activeObservers.indexOf(observer);
        if (idx !== -1) activeObservers.splice(idx, 1);
        resolve(find());
      }, timeout);
    });
  }

  function compactNumber(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return value ?? "";
    return new Intl.NumberFormat("en-US", { notation: "compact" }).format(
      numeric,
    );
  }

  function formatVoterCount(value) {
    return String(value ?? "").replace(/,/g, "");
  }

  function injectTop250Style() {
    if (document.getElementById(IMDB_TOP_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = IMDB_TOP_STYLE_ID;
    style.textContent =
      ".top250{display:inline-flex;align-items:center;gap:6px;font:12px/1.4 Helvetica,Arial,sans-serif;margin:8px 0;padding:5px 10px;background:#f5c518;border-radius:4px}" +
      ".top250-no{font-weight:700;color:#000}" +
      ".top250-link a{color:#000;text-decoration:underline}";
    document.head.appendChild(style);
  }

  // 罗马数字 → 阿拉伯数字映射表
  const ROMAN_TO_ARABIC = {
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    viii: 8,
    ix: 9,
    x: 10,
  };

  function buildMetacriticSlug(title) {
    return title
      .toLowerCase()
      .replace(/[:'".,?!&]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "")
      .replace(
        /-(ii|iii|iv|v|vi|vii|viii|ix|x)$/,
        (_, roman) => `-${ROMAN_TO_ARABIC[roman]}`,
      );
  }

  function buildTomatoIcon(icon) {
    return `<span style="font-size:14px;vertical-align:middle;margin:0 2px">${icon}</span>`;
  }

  // ─── OMDB Key 轮询（round-robin），避免随机命中同一个超限 key ───
  let omdbKeyIndex = 0;
  function getNextOmdbKey() {
    return OMDB_KEYS[omdbKeyIndex++ % OMDB_KEYS.length];
  }

  async function getIMDbInfo(id) {
    const key = getNextOmdbKey();
    const [omdbResult, imdbResult] = await Promise.allSettled([
      gmJson(`https://www.omdbapi.com/?tomatoes=true&apikey=${key}&i=${id}`),
      gmJsonp(
        `https://p.media-imdb.com/static-content/documents/v1/title/${id}/ratings%3Fjsonp=imdb.rating.run:imdb.api.title.ratings/data.json`,
      ),
    ]);
    const omdb = omdbResult.status === "fulfilled" ? omdbResult.value : null;
    const imdb = imdbResult.status === "fulfilled" ? imdbResult.value : null;
    const data = omdb || {};
    const resource = imdb?.resource;

    if (resource) {
      if (resource.rating) data.imdbRating = resource.rating;
      if (resource.ratingCount) data.imdbVotes = resource.ratingCount;
      if (resource.ratingsHistograms?.["IMDb Users"])
        data.histogram = resource.ratingsHistograms["IMDb Users"].histogram;
      if (resource.topRank) data.topRank = resource.topRank;
    }

    return data;
  }

  async function getDoubanInfo(id) {
    // 豆瓣 v2 开放 API 已下线（code 104 invalid_apikey），且 subject_suggest 按 IMDb
    // tt 编号搜索已失效（返回空数组）——改按 IMDb 页的英文片名+年份搜索。
    const title = (qs("h1, [data-testid='hero__pageTitle']")?.textContent || "")
      .trim()
      .replace(/\s+/g, " ");
    const year = document.title.match(/\((\d{4})\)/)?.[1];
    if (!title) {
      console.warn("[影评聚合] 未能从页面取到片名");
      return undefined;
    }
    console.log("[影评聚合] 豆瓣搜索:", title, year || "");

    const suggestions = await gmJson(
      `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(title)}`,
    );
    if (!Array.isArray(suggestions) || !suggestions.length) {
      console.warn("[影评聚合] subject_suggest 无结果:", title);
      return undefined;
    }

    // 优先精确匹配电影 + 年份，其次任一电影结果，再退到第一个建议
    const hit =
      suggestions.find((s) => s.type === "movie" && (!year || s.year === year)) ||
      suggestions.find((s) => s.type === "movie") ||
      suggestions[0];
    if (!hit?.id) return undefined;

    const abstract = await gmJson(
      `https://movie.douban.com/j/subject_abstract?subject_id=${hit.id}`,
    );
    return {
      url: `https://movie.douban.com/subject/${hit.id}/`,
      rating: {
        numRaters: "",
        max: 10,
        average: abstract?.subject?.rate || "",
      },
      title: hit.title || hit.sub_title,
    };
  }

  async function getDoubanSubjectRating(dbId) {
    const abstract = await gmJson(
      `https://movie.douban.com/j/subject_abstract?subject_id=${dbId}`,
    );
    const subject = abstract?.subject;
    if (!subject) return undefined;

    return {
      url: `https://movie.douban.com/subject/${dbId}/`,
      rating: {
        numRaters: "",
        max: 10,
        average: subject.rate || "?",
      },
      title: subject.title || document.title,
    };
  }

  function insertDoubanRating(
    parent,
    title,
    rating,
    link,
    numRaters,
    histogram,
  ) {
    const numericRating = Number(rating);
    const star = (5 * Math.round(numericRating)).toString().padStart(2, "0");
    const displayRating = Number.isFinite(numericRating)
      ? numericRating.toFixed(1)
      : rating;
    const safeLink = safeUrl(link);
    let histogramHtml = "";

    if (histogram && numRaters) {
      const histogramValues = Object.values(histogram);
      const max = Math.max(...histogramValues, 0);

      histogramHtml =
        '<div class="ratings-on-weight">' +
        Array.from({ length: 10 }, (_, index) => 10 - index)
          .map((score) => {
            const count = Number(histogram[score] || 0);
            const percent = numRaters
              ? ((count * 100) / numRaters).toFixed(1)
              : "0.0";
            const width = max ? (64 / max) * count : 0;
            return `<div class="item"><span class="stars${score} starstop" style="width:18px;text-align:center;display:inline-block">${score}</span><div class="power" style="width:${width}px;height:12px;background:#f2b134;display:inline-block;vertical-align:middle"></div><span class="rating_per" style="margin-left:4px">${percent}%</span></div>`;
          })
          .join("") +
        "</div>";
    }

    parent.insertAdjacentHTML(
      "beforeend",
      `
            <div class="rating_logo">${escapeHtml(title)}</div>
            <div class="rating_self clearfix">
                <strong class="ll rating_num">${escapeHtml(displayRating)}</strong>
                <div class="rating_right">
                    <div class="ll bigstar${star}"></div>
                    <div style="clear:both" class="rating_sum">
                        <a href="${safeLink}" target="_blank" rel="noopener noreferrer">${escapeHtml(formatVoterCount(numRaters))}人评价</a>
                    </div>
                </div>
            </div>${histogramHtml}`,
    );
  }

  function insertDoubanInfo(name, value) {
    const info = qs("#info");
    if (!info) return;

    if (info.lastElementChild?.nodeName !== "BR") {
      info.insertAdjacentHTML("beforeend", "<br>");
    }

    info.insertAdjacentHTML(
      "beforeend",
      `<span class="pl">${escapeHtml(name)}:</span> ${escapeHtml(value)}<br>`,
    );
  }

  /**
   * 将文本节点替换为超链接，并返回链接 ID。
   * 若节点已是 <a> 标签（脚本重跑或页面热更新），则直接读取文本内容避免嵌套锚点。
   */
  function linkify(node, base) {
    if (!node) return null;

    // 已经是锚点：直接取值，不再重复替换
    if (node.nodeName === "A") {
      return node.textContent.trim() || null;
    }

    const id = node.textContent?.trim();
    if (!id) return null;

    const anchor = Object.assign(document.createElement("a"), {
      href: base + id,
      target: "_blank",
      rel: "noopener noreferrer",
      textContent: id,
    });
    node.replaceWith(anchor);
    anchor.insertAdjacentText("beforebegin", " ");
    return id;
  }

  function renderMetascore(container, data) {
    if (isNA(data.Metascore)) return;

    const metascore = parseInt(data.Metascore, 10);
    const color = metascore >= 60 ? "#6c3" : metascore >= 40 ? "#fc3" : "#f00";
    const pageTitle = (qs("h1")?.textContent?.trim() || document.title)
      .replace(/ - 豆瓣.*$/, "")
      .replace(/（.*/, "")
      .trim();
    const metaUrl = data.Title
      ? `https://www.metacritic.com/movie/${buildMetacriticSlug(data.Title)}/`
      : `https://www.metacritic.com/search/all/${encodeURIComponent(pageTitle)}/results`;
    const safeMetaUrl = safeUrl(metaUrl);

    container.insertAdjacentHTML(
      "beforeend",
      `<br>Metascore: <a href="${safeMetaUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none"><span style="background-color:${color};color:#fff;height:24px;width:24px;line-height:24px;text-align:center;display:inline-block;font-weight:700;border-radius:2px;vertical-align:middle">${escapeHtml(String(metascore))}</span></a>`,
    );
  }

  function renderRottenTomatoes(container, data) {
    const rt = data.Ratings?.find((item) => item.Source === "Rotten Tomatoes");
    if (!rt?.Value) return;

    const fresh = parseInt(rt.Value, 10) >= 60;
    const tomatoUrl = safeUrl(
      (data.tomatoURL || "").replace("http://", "https://"),
    );

    container.insertAdjacentHTML(
      "beforeend",
      `<br><a href="${tomatoUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">${buildTomatoIcon(fresh ? TOMATO_ICON_FRESH : TOMATO_ICON_ROTTEN)}<span>${escapeHtml(rt.Value)} 烂番茄新鲜度</span></a>`,
    );

    if (isNA(data.tomatoUserMeter)) return;

    const userPositive = parseFloat(data.tomatoUserRating) >= 3.5;
    container.insertAdjacentHTML(
      "beforeend",
      `<a href="${tomatoUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;margin-left:8px">${buildTomatoIcon(userPositive ? TOMATO_USER_ICON_POSITIVE : TOMATO_USER_ICON_NEGATIVE)}<span>${escapeHtml(String(data.tomatoUserMeter))}% 观众爆米花</span></a>`,
    );
  }

  function ensureRecoveredDoubanRating(dbId) {
    const subjectWrap = qs(".subjectwrap");
    const subject = qs(".subject");
    if (!subjectWrap || !subject) return null;

    const section = document.createElement("div");
    section.id = "interest_sectl";
    subjectWrap.insertBefore(section, subject.nextSibling);

    const wrap = document.createElement("div");
    wrap.className = "rating_wrap";
    section.appendChild(wrap);

    getDoubanSubjectRating(dbId).then((data) => {
      if (data?.rating && !isNA(data.rating.average)) {
        insertDoubanRating(
          wrap,
          "豆瓣评分",
          data.rating.average,
          `https://movie.douban.com/subject/${dbId}/collections`,
          data.rating.numRaters,
        );
      }
      wrap.title = DOUBAN_RECOVERED_TITLE;
    });

    if (qs("#movie-rating-iframe")) {
      section.style.marginTop = "96px";
    }

    return section;
  }

  async function handleDoubanMoviePage() {
    await waitForElement("#info");

    const dbId = location.href.match(/douban\.com\/subject\/(\d+)/)?.[1];
    let section = document.getElementById("interest_sectl");

    if (!section) {
      if (!dbId) return;
      section = ensureRecoveredDoubanRating(dbId);
      if (!section) return;
    }

    if (document.getElementById("movie-rating-integrator-extra")) return;

    const imdbLabel = qsa("#info > span.pl").find(
      (node) => node.innerText.trim() === "IMDb:",
    );
    const imdbNode = imdbLabel?.nextSibling;
    if (!imdbNode) return;

    const imdbId = linkify(imdbNode, "https://www.imdb.com/title/");
    if (!imdbId) return;

    const data = await getIMDbInfo(imdbId);
    const hasRottenTomatoes = Boolean(
      data?.Ratings?.find((item) => item.Source === "Rotten Tomatoes")?.Value,
    );
    const hasExtraInfo = !isNA(data?.Rated) || !isNA(data?.BoxOffice);
    if (
      !data ||
      (isNA(data.imdbRating) &&
        isNA(data.Metascore) &&
        !hasRottenTomatoes &&
        !hasExtraInfo)
    )
      return;

    const ratings = document.createElement("div");
    ratings.id = "movie-rating-integrator-extra";
    ratings.className = "rating_wrap clearbox";
    ratings.style.cssText = "padding:15px 0;border-top:1px solid #eaeaea;";

    const ratingWrap = qs(".friends_rating_wrap") || qs(".rating_wrap");
    section.insertBefore(ratings, ratingWrap?.nextSibling || null);
    section.style.marginBottom = qs(".colbutt") ? "-136px" : "-154px";

    const recommendation = qs(".rec-sec, #interest_sect_level");
    if (recommendation) {
      recommendation.style.width = "488px";
    }

    if (!isNA(data.imdbRating)) {
      insertDoubanRating(
        ratings,
        "IMDb评分",
        data.imdbRating,
        `https://www.imdb.com/title/${imdbId}/ratings`,
        data.imdbVotes,
        data.histogram,
      );

      if (!isNA(data.topRank) && data.topRank <= 250 && !qs(".top250")) {
        injectTop250Style();
        (
          document.getElementById("dale_movie_subject_top_icon") || qs("h1")
        )?.insertAdjacentHTML(
          "beforebegin",
          `<div class="top250"><span class="top250-no">No.${data.topRank}</span><span class="top250-link"><a href="https://www.imdb.com/chart/top">IMDb Top 250</a></span></div>`,
        );
      }
    }

    renderMetascore(ratings, data);
    renderRottenTomatoes(ratings, data);

    if (!isNA(data.Rated)) insertDoubanInfo("MPAA评级", data.Rated);
    if (!isNA(data.BoxOffice)) insertDoubanInfo("票房", data.BoxOffice);
  }

  function handleDoubanPersonPage() {
    const node = qsa("span.value").find((item) =>
      /^nm\d+/.test(item.innerText.trim()),
    );
    if (node) {
      linkify(node, "https://www.imdb.com/name/");
    }
  }

  // 不再克隆 IMDb 原生评分节点：IMDb 用 CSS-in-JS（styled-components），
  // 很多样式依赖"原来所在的父容器上下文"（百分比高度、flex 隐式约束等），
  // 节点被搬到新位置后这些样式会失效、导致布局塌陷（表现为只剩一行标签、没有分数）。
  // 因此改为插入一个自带内联样式、视觉上风格相近但完全独立于 IMDb 内部 class 的徽标。
  // ratingStr 为空表示豆瓣条目存在但暂无评分，此时展示片名 + 占位符
  function buildDoubanBadge(data, ratingStr) {
    const badge = document.createElement("div");
    badge.id = "movie-rating-integrator-douban";
    badge.style.cssText =
      "display:flex;flex-direction:column;align-items:center;justify-content:center;margin-left:32px;padding-left:32px;border-left:1px solid rgba(255,255,255,0.15);cursor:pointer;line-height:1.3;font-family:inherit;text-align:center";
    badge.title = `豆瓣：${data.title}${ratingStr ? `（${ratingStr}）` : "（暂无评分）"}`;
    const scoreHtml = ratingStr
      ? '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;background:#2ea44f;color:#fff;font-size:11px;font-weight:700;line-height:1;flex-shrink:0">豆</span>' +
        `<span style="font-size:26px;font-weight:700;color:#f5c518">${escapeHtml(ratingStr)}</span>` +
        '<span style="font-size:14px;color:#a2a2a2">/10</span>'
      : `<span style="display:inline-block;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:16px;font-weight:700;color:#f5c518">${escapeHtml(data.title)}</span>` +
        '<span style="font-size:12px;color:#a2a2a2;white-space:nowrap">暂无评分</span>';
    badge.innerHTML =
      '<span style="font-size:13px;font-weight:600;letter-spacing:0.08em;color:#a2a2a2;white-space:nowrap">豆瓣评分</span>' +
      '<span style="display:flex;align-items:center;gap:6px;margin-top:6px">' +
      scoreHtml +
      "</span>";
    badge.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.open(data.url, "_blank", "noopener");
    });
    return badge;
  }

  async function handleImdbPage() {
    const id = location.href.match(/tt\d+/)?.[0];
    if (!id) return;

    // 1) 等标题渲染（IMDb 是 SPA，document-end 时可能还没填充）
    await waitForAny(['[data-testid="hero__pageTitle"]', "h1"], 10000);

    // 2) 等聚合评分块：多候选选择器，命中任意一个即可
    const selectors = [
      '[data-testid="hero-rating-bar__aggregate-rating"]',
      '[data-testid="aggregateRating"]',
      '[data-testid="titleRatingAndRatingCount"]',
      ".rating-bar__base-button",
      '[class*="AggregateRating"]',
    ];

    // 文本兜底：找不到 testid 时，用 "8.3/10" 这类文本定位分数节点所在的容器
    const findAnchor = () => {
      const hit = selectors.map((s) => qs(s)).find(Boolean);
      if (hit) return hit;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (/^\s*\d\.\d\s*\/\s*10\s*$/.test(node.textContent)) {
          return node.parentElement?.closest("div,span");
        }
      }
      return null;
    };

    const bar = await waitForAny(selectors, 12000);

    // 3) 取豆瓣数据：条目未找到才跳过；找到但暂无评分时仍显示占位徽标
    const data = await getDoubanInfo(id);
    if (!data) {
      console.warn("[影评聚合] 未找到豆瓣条目，跳过插入");
      return;
    }
    if (document.getElementById("movie-rating-integrator-douban")) return;

    const anchor = bar || findAnchor();
    if (!anchor) {
      console.warn(
        "[影评聚合] 未找到 IMDb 评分块。当前页面 rating 相关 testid：",
        [...document.querySelectorAll("[data-testid]")]
          .map((e) => e.getAttribute("data-testid"))
          .filter((t) => /rating/i.test(t)),
      );
      return;
    }

    const rating = Number(data.rating?.average);
    const ratingStr =
      data.rating?.average && Number.isFinite(rating) ? rating.toFixed(1) : "";

    const badge = buildDoubanBadge(data, ratingStr);
    (anchor.parentElement || anchor).appendChild(badge);
    console.log("[影评聚合] 已插入豆瓣评分:", ratingStr || "暂无评分", data.url);

    // 如果 IMDb 的 React 在后续渲染中移除了我们插入的节点，自动重试插入（最多重试若干次）
    try {
      let retries = 0;
      const maxRetries = 6; // 尝试 6 次
      const observer = new MutationObserver(() => {
        if (document.getElementById("movie-rating-integrator-douban")) return;
        if (retries++ >= maxRetries) {
          try {
            observer.disconnect();
            const idx = activeObservers.indexOf(observer);
            if (idx !== -1) activeObservers.splice(idx, 1);
          } catch {}
          return;
        }
        const newAnchor = findAnchor();
        if (!newAnchor) return;
        const newBadge = buildDoubanBadge(data, ratingStr);
        (newAnchor.parentElement || newAnchor).appendChild(newBadge);
        console.log("[影评聚合] 重新插入豆瓣评分 (retry):", ratingStr || "暂无评分", data.url);
      });
      activeObservers.push(observer);
      observer.observe(document.documentElement, { childList: true, subtree: true });

      // 最多观察 30 秒后自动断开
      setTimeout(() => {
        try {
          observer.disconnect();
          const idx = activeObservers.indexOf(observer);
          if (idx !== -1) activeObservers.splice(idx, 1);
        } catch {}
      }, 30000);
    } catch (e) {
      console.warn("[影评聚合] 无法创建重试 observer:", e);
    }
  }

  // 页面卸载时清理所有活跃的 observers，防止内存泄漏
  window.addEventListener("beforeunload", () => {
    activeObservers.forEach((observer) => {
      try {
        observer.disconnect();
      } catch {}
    });
    activeObservers.length = 0;
  });

  function init() {
    if (host === "movie.douban.com") {
      handleDoubanMoviePage();
    } else if (host === "www.douban.com") {
      handleDoubanPersonPage();
    } else if (host === "www.imdb.com") {
      handleImdbPage();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
