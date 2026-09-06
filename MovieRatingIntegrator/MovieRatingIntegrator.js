// ==UserScript==
// @name         影评聚合
// @name:en      Movie Ratings
// @name:zh-CN   影评聚合
// @namespace    https://github.com/x-ww/MovieRatingIntegrator
// @version      1.5.1
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

  const TOMATO_ICON_FRESH =
    "iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAFBElEQVR4Aa2VA7TszBpEd6c7yfiY13q2bdu2bdu2bdu2bdtHGGei7u9l8Ju4tVaNsKtaieJsyA917djNjrzk9z/a/hzwKc6BDGdDpbo/e3i1es3NYPtrrX+1K0B0XAI8rUJtvKA6E+6J/9XV57/I9PX/mGX/A77D2ZQ6xRuFBzgAE+r6ngvO3ODoFVfuV58LyvZPvSs1zt+wP/3W/56YRPnuf3698xGgc45GIChvam/1KqsXnLnYwQvN3nTPhWeulXStIXO0kjb/+vh/zEVue/AZUvPi1f8kgx+ttT8GJGd7BABTvlm5/NX3vlEuM3/TxaUSTdH8+7d9yv/oUGsY6pecJlguMb8z2M7/3Pvd5k+3Pv/DP+y8D/jXWQYESgXXPDh7p/lbHnhcfqh6QV02DFKo4fhnU6hVNIcWNO4fEUEno1sExg2fcGvw73984l8v/M5vN98CJKcbMOXpmdtecvWljasu3fNif4459p+UPx30+f6NF9ChR9bLiaqG0PeY++uA+759g1rHsjal+d2hkJ9dosLar7ff88Wv/euRwPYpAspKlZ+8uvzWix1o3PFyu5YlrSAsrODpt1vk9/tC7vyONbpW+MpN5hkcrnCjLzS5ywe2yX2FlwstDd89EvCTne6HX/aX/90DiE4MeHh95glPm5t7fqWqyBYNa4s+67OGv84FfPlgmUN/6/O4r7ao/zvn+0XjN99/menA48kv/C9hIuRG4TswuaPvK17YbT4NeDaAdwE/uPADGtMPV3VNuuwTzfv8YUbzw1mffxrFdX/X5cH/TPCXA9pHQq7Ycdzxg9sMrBCXNZ5jpMyDQRHqKcV9a1MP/fygf/HCmJuUardaDM2yqiqkoalO+1y3EXD9IMTzFH7FJ1tIiHQKqdCZN1z5rwl/+GWfqKKY3RUEheIkzXt64abl6q2BX5orh+Wr4wMlUKGCqoaZMt5CHVUyJO2EfLODF+dQUtgSeL7H5X4VQS6Id0o4gAOuGJavCWD2G3MIBSiFGAWeQrRGygGqXoIhWHuFx9+pwkkAB9YzlIJMn4SXCTxFmNFmH4ApKVXCAVYgH1uSDNcejJ/7KZLZwoLkbvw9inIuoECGhglCSIFYhIE4H8A0rdtdzlklFlQkSD9HBTHWOZTWSJpDO0H1LcQCiYCVERg1AU9aJwgRMED4n827AOZ3efLrC2bBRaQn2HaGNuDsMCxHlMLlDgq4a2fQdhAJOBA1BmeT1hHD1kJfHD3n+FUa/xbAfDmOPnvrSv2O0negwUqOShwq9MBTkDskLty20BRcIghCJpw0HQzBhZ2li9DKUr4fDz4zCeh/7odp/N3LB6Ur03GQgnQtEqoTA4hB+oIkQgYjeMKkNePWXWfp2Jx2nvHrOPrRr7Pk0wAK4CrFlnrX3MrHpjxvGgAP0JOvRRAL1o3hyaR1xLCxG8HbtoC7bNR8LYk7n8iy2wJfOsXF7o7Vxj1eOr3w+lCpEsJIMrKQAhlCDEQiI/ecK2xpuXHrVhKzlSXZ16x9MPDm071c36Rcu9XTp+ZecNj4xxyQTxYxnrTuU1gsPetonwDOEpppwj/z/G8/FnkS8MEzveEcMv7R+9amH3bdcuWWs57ZOxA32R1CT9x4ngu38rQAx/w3zf73B3Gf+BO8Cvjj6d9wTkdHjH+BS4Wla1zQhFde0PqCGuaK9n4zy9LNLGn+O0//8A/rvrsG3wB+xxno/+N5rMoDguFXAAAAAElFTkSuQmCC";
  const TOMATO_ICON_ROTTEN =
    "iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAFZ0lEQVR4Ac1UA5Qj7RYMhwjGtk10upOsbTtr28YoM6uxbRtr29Zv22a9O3q265w6za+uwPtr0Jfo+npGWmuDBzsUmDmYTOYL+GLevwsSCwNmbVzQq02XGbRcZZBWF/VDgMoumc/ni/51dT5PMGK2e8uJ+yR+TYHGSyw6bjI4Uhn9i8zGaNi/rC/SEZqu14a+X3eRRWEnsYNFEV2zmxVwCTRf+fv/CsVCqaFcP5zS6ScQ8vX+qrCugdhW31jHpfvHiUt8LpWdYJHZqEBmgwLZTQoklSpg5Sqd1v+/qZ3xcM3G0GuZdWO+0BYM/yh0iFO+SFdo9mfFnfzMVmw7EvLGnszwDwKUtomWzpJpuzKivslq4nC4gkV6HYcFO0Le0zEQ2/MIBjK9wPXaqPcbLo6hGo3H2YfTUXFyAryibVP+RNzS0WRIZn3El513GFSeY5Fcx/5q7iSZbOYombJOG/nN0SolDpVzCB7kkNt/xj3Mam9KtZLqokRqjRpZTYNRc3Ykxi8JfC4QCoz/wECI0mpj01UFyk+zyGjhkNKoQuQo57Ie426yhTvSGRJRImK4U1FPjcRCySiN14XDFRwSilloiXRFer0KU9YEfUx1sfnD9PjI55SdYlByksORWhZJ5PHymIiPKYopcnuTieuTon44WsVhV2b096M1nikAL/O9ElvA/qIt5ZBUxuJgGaWxkkgRRY/1eEbz8ocRiPVEVpOW+1zKP9brfWwJBy0d2put+GVnGvNrQhGLeGJiCQvyGgeJ9B1JNSpoy5WIp/9jCllM3xAKmbXxvj8/tdQ9oUMcMpfFhn+SSIdIDIml5F05RwIs4sjb35LEY4hT14ciYqTHNz6MwzOXQOsrEkvDWPJewvtroC6xDVDbpx8oYn89VMshsYolT8nbavK8pptKpDQpsSE5Guau8nahjtCFz+cJe8bzr4EicLawN2KlFgbBFtSiW1Ijv87q4JDazCGtpY/NbM81o40MVzJQTHA7ae4snSqxMlLrmeh6UfcY/NnF4BxovnZ5TMhre3Iiv9qaFvHpgaLo7zNau0XZPnJIb+0mS+IsyDByqV5ZnQrElDDYmBL5w+xtQW+rpnlesPSQL/+DiZbbGY/clhb+Sd7xnoPE3mtmO4ucrl5vM0k0u5Mj0to4zaH8ghJVl1WouqRG3dXBaLk1DJ33RuH4gwlIrh4OP7VDqUDUF03wEMei5AYFCfaIEVnkHe8VyyCPS86qUHpWjfLzA9F4YyjiC5U/RI5wur5iT8T7px9NxenHM3DmyWycfzYXF15ocOe1xcisHQtbP/NtNO2hPEtX6ZyY4sivKy5wKD6jQs1lNfI6VVBO9bjoq7TPT6sf/N3Jx5Nw/P5UXH5pDtbsY94X6QlDdQzF0Zu0qvdvv7oYF19aiEsvLcD55wt6ruceaDBoms81O1/z/bzu/R400P5o0fEhaL89FmUnR4MZ59ZG3SEX6Yls1sYwL918ZSF5Nx/XX1mEmhNTYOko2csjWHuaripun4irLy9A15056LgxG81XZhCnY8zCwFfdI2xo8gnd+bJykU4KG+gQa+9lqhGKBEa9q1hgsmBz+PUbJHz2iQZnHmsoCg0mzA19nb65dDvHjHPvKOmaiOKuSUij1CRXjcburEHwYR0vmzlIdvH+FlQTPKpPPZiD1qszUHd+CkU5HbNWRf1I0z+gp72pPQfO8Lm3PFaBRfsZTN8agbCRbu/pGekMobY1/5sGTCwN1Uv2Mh/HFQ3r8WzO+mjYeZi108TKfn84bbzNdjr4W5abOUgTxboiP94/AjIyyD3KrtMl2OaWsZnBnh7P/p0QUcGltiarjC0MD4j1hNG8/yf8BrCAoJdN16WUAAAAAElFTkSuQmCC";
  const TOMATO_USER_ICON_POSITIVE =
    "iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAFK0lEQVR4AZTNQ4DsWAAF0JsXFJIygm/btm3btoXN2LZt27bRtm2nKprGdlr3mYegndA0ocMhV5gQilzdO+CmJ25c9uonL556dtwIaSLQEo/b4aUag/9Ju8CC2SMXvvP8kQ/uuW7Vfdu3bdkxdfLkWZNHKdPO7Z5288wJvRY8eOuORy4cmn4ZgNUpQJF8XWZM6DH7zMEFF7o52bFrZvQ53G/kVNnrZ4WqyiJj0crVM568afkbC4bZ9nf30SMH9vYM7TDg8/C+2y/NffiFOzZ8On6oNM0VFk04esLUSmCodfaKzDRaL/sFvoCd93Xvj5lzV8zZu2XCoQ4BTo7hH7pp3RMrlk9f6g0rdF3BP+AYjYS72VGUGgPG0hES/SgvZlBTrsGqL4TXU0sU0d6dt3N8m4AblOeOwd0fmT1JWuUMjQYIi/rKepSn/IyKrBgwQg9wPAOV6Ql/r/7wSjx0tQJ15dWYMm7IotsPL76Xp2mhVWC34D2y4uj0LXzXYdCqs2GoVRBHzIKnx1BUF1fBrImBFjUg9ekFWktDpLYCFiuDYRlYhKLnDnLt3m8XTrYKjAczla7gYA/2hIpy1FQVorqkGLSgINyrJyJVpYCpw2YzQTu6gqK8cCsKNLMIzpAXLkcAM3jHvFaBCEEDc9fnqNx9A7TPEsDWmjDqMgEOYCUFoVETUakZSE7JBngB4AREc9Nh/ZgG9sbPYLv6PqKa2dAqkMLR8XB5YL70O6wz74E++gmc1/6GyOnXoF33HYw7f4brmVgID/4I9fRLIOc+gLbrbXDXJUB7NgYmKyCGpf9qFUiHlSo8fDfI0H6wiAVU69C/y4P2bgzURz5Bwy3vgn74ezje/hvW+3HQv4gBVanDpCyQwb3geuRupFpmYqtAXl1NTtTnjRBZApFEuF9+GsL9N4MKCiDdJNj3bodt72ZYXYCAR2g8u63xzjMgsghalhAN+CK5tTU5rQIFqppXEBtbClEEGlQwo0bAcWAvYLM3IgEI99zW2O4AFQoBNq7prPHOyP8qK4cEWK4Aip42Y3tFyR5CDJNRsImY09j2t+2wzVJbVY+prmnQSfHp3vMEbBhiY4175dexE4bDfwRMYdKv1R3uvhOzXKA8H2MtqVwOKxUYk7wIBfl8EtZ+gFkssbGmX/vDmcL4HwELa+f9334fmttvwypJNJsjUylMoZjErbFYazBSYotFVDqNms0wSmBjTffX3wdbj3/bKsJWo97W112HtaCnUyRgSwWMUmhrURa01glAA2I6QxnLVtOp1zrA5t8A1Pv9miqXkPkCejzBAKZcTEz11sgatJLoUikB6MkUlSsgqxVqg/4fOze77mTSWksp1DVXI12PxKRYRmuJwiSQBBZDJSA8DxOXDYUQncm4uRMwULI38YOZufEGhOsiAV0uoZRBaoNKAApVKiKAyHFRcdlpMFoMpRzsBDgi6nmDgW/vuQfpeFjAlEoordFSIqVAJi0ooxOAA/fchT8ceI4QvZ2AhWXS/O67YD0eI6OQDKCvvZZIa1Q6g8pkENpgr7mWJC/cEE4m1L75NphZO9oJAKKfzp/73Dt5kmWrzeqzL5GLBWo7XZ0hdjjEpMAs5qzjvFWzjXfyFHvOn/sCiP4LgO/Wq9ffN+L5oF4T/UceZ/X9D6TSsHzgYRYPPJQA5j/8RPfRx/HjMh8Z+eK369Wr/+fQX705Dp58ehrc+7YMXz6wWR88G4U/n2+1m6earT+OhZuzejerve+J8JVnp8F9b4z9J4DV3xn9CYgbvHRBBzqoAAAAAElFTkSuQmCC";
  const TOMATO_USER_ICON_NEGATIVE =
    "iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAEXklEQVR4Ae2UQ6MjWRiG33NOpVJIUhX7KpdtjW3btpfzG2Y9mxE2Y9tm27Z9jSRlTKaGbaz7LfP5jBM6kgiOQ5SCyxTFCeOnpa9L5sOtS2b2vw7gexxE3GHpFEwQOSUS4zOpjFpKZ5XmbE5tbatUWjip2gZhRw+ciBKLRcd/8/76YQALD+sBH2aR7smpyxvfd2Tz6VJzU1ux0trekkwlE+lkTpEkWTbtKtGMUSxa/wH29m3Gip+SsHSKbPeueW89t/JyAEMHBSTSQuW6+5tePfusc87oKJ0Lx7VQ1QYwPLYLo7VeaMYQdHMMrufAhw9BYujfImPl7zI8l6BtiubPn7PkTgBvHQAgBPS2J7o/PPW8wrXETsL3AI6FIAoKZFFBTM4iKmcgNc55TsacFW9i9+AibFqQwe6NPBgF5LgNHWtfBPDoPjkIiyxWaIpMa+4MnT2t63JMb38UPjzwnADWgOyvmjaE35a8ANsGasMMjPoglMDQGMS00PnF2xsUAKP/Alo6Yme19agXqaqY6O3rxXztUxjWGCy7Bt2swrQ12LYRbI5nw3bq0N29IE4EpkZAGAAgCBPxWJLjiLQPIF2QxmcL0kT4PFatmwutPhOUAoRQUMYQHAkJzhnh4MMGEz24dgi+R0EI4CPYAT4VKSP7uM01SjArRbhUrabjunOfQnvTGbBtG5RSMEIARkB8EkD4sIB122bhk9+ehO+GIIoyQHzADwBgjOcIAdsHYFtu3bY93bE89A/ugcRvhuvaoIwDoyzYaLBRCEIMtfoIPN8DYRxURQGhPnxQ+B6BSTkfjWUfQHXE2l0btXdnCyK+/vVpGIYZWEUaG0BAKQEJQkRBwMCFGGQlFHgkRRX4YKAE4BqgvjqxPM939gEM9hoblYTWUqpwmDHpBkysXIKRai8MqwbTqsO2dZh2HYb5Z+J1GNYoeodXgcLGxHYeYeZAtxXsHCLQBrQR1/GNfQDbN47NMgyn2j4+fJ9ujGQkMYGonIYgRMCHJHCcEPQECEGIA6q1Pjz79r0Yre3E2VNGkRHqsHgev65T4Lqt2rd0g3XQTr705uaXuyZGH5T4JCgNwXHNv5stCllqQKUkVKUQHOev+BBbdy3Hw1fciS41jj2bF4AQAeFkS+/Fd794NoD1+Fv/ZnzXlvpsQUa+p3ty1xnTb2PlwkSSTVQg8BEYZg39Q9uweccCrNn4E+raACyXQIaBKc05REsTURvYiWg8JYyf0Fnp7xvEgqVbN45VdYfsO4YJpyb5rkxO6Sw3FdtLTbm2YqnU1N7W1dwYd4lYLK6KgiQ2QomvZ74Es7oV908ahpbWqUDYgM8SQSn7zgC+XUA++fHXxT+Qo5n9gsipUYXPp9JqUyIdbS2VcxXGG20O65vQU0hHWtTSxrOnTu+CuUsaHBrarVaupG99OPPNWXOXzyI4ToVFFm/rjF1BeGRH99o/P3DLRVcrvB6fu3DtPCtU1mbNXTFzeGRsGCd0JP0BLHO0MJZ4Kw0AAAAASUVORK5CYII=";

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
      .replace(/"/g, "&quot;")
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
      ".top250{background:url(https://img1.doubanio.com/f/movie/f8a7b5e23d00edee6b42c6424989ce6683aa2fff/pics/movie/top250_bg.png) no-repeat;width:150px;font:12px Helvetica,Arial,sans-serif;margin:5px 0;color:#744900;display:inline-block}.top250 span{display:inline-block;text-align:center;height:18px;line-height:18px}.top250 a{color:#744900;text-decoration:none;background:none}.top250-no{width:34%}.top250-link{width:66%}";
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

  function buildTomatoIcon(base64) {
    return `background:url(data:image/png;base64,${base64}) no-repeat;background-size:cover;width:18px;height:18px;margin:0 2px;vertical-align:middle;display:inline-block`;
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
      title: hit.sub_title || hit.title,
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
            return `<div class="item"><span class="stars${score} starstop" style="width:18px;text-align:center">${score}</span><div class="power" style="width:${width}px"></div><span class="rating_per">${percent}%</span><br></div>`;
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
      `<br>Metascore: <a href="${safeMetaUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none"><span style="background-color:${color};color:#fff;height:24px;width:24px;line-height:24px;vertical-align:middle;display:inline-block;text-align:center;font-weight:bold">${escapeHtml(data.Metascore)}</span></a>`,
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
      `<br><a href="${tomatoUrl}" target="_blank" rel="noopener noreferrer" style="background:none"><span style="${buildTomatoIcon(fresh ? TOMATO_ICON_FRESH : TOMATO_ICON_ROTTEN)}"></span></a><span style="vertical-align:middle;display:inline-block;line-height:18px">${escapeHtml(rt.Value)}</span>`,
    );

    if (isNA(data.tomatoUserMeter)) return;

    const userPositive = parseFloat(data.tomatoUserRating) >= 3.5;
    container.insertAdjacentHTML(
      "beforeend",
      `<a href="${tomatoUrl}" target="_blank" rel="noopener noreferrer" style="background:none"><span style="${buildTomatoIcon(userPositive ? TOMATO_USER_ICON_POSITIVE : TOMATO_USER_ICON_NEGATIVE)}"></span></a><span style="vertical-align:middle;display:inline-block;line-height:18px">${escapeHtml(data.tomatoUserMeter)}%</span>`,
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

  async function handleImdbPage() {
    const id = location.href.match(/tt\d+/)?.[0];
    if (!id) return;

    // 1) 等标题渲染（IMDb 是 SPA，document-end 时可能还没填充）
    await waitForAny(['[data-testid="hero__pageTitle"]', "h1"], 10000);

    // 2) 等聚合评分块：多候选选择器，命中任意一个即可
    const bar = await waitForAny(
      [
        '[data-testid="hero-rating-bar__aggregate-rating"]',
        '[data-testid="aggregateRating"]',
        '[data-testid="titleRatingAndRatingCount"]',
        ".rating-bar__base-button",
        '[class*="AggregateRating"]',
      ],
      12000,
    );

    // 3) 取豆瓣数据
    const data = await getDoubanInfo(id);
    if (!data?.rating?.average) {
      console.warn("[影评聚合] 豆瓣数据缺失，跳过插入");
      return;
    }
    if (document.getElementById("movie-rating-integrator-douban")) return;

    // 4) 文本兜底：找不到 testid 时，用 "8.3/10" 这类文本定位分数节点
    let anchor = bar;
    if (!anchor) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (/^\s*\d\.\d\s*\/\s*10\s*$/.test(node.textContent)) {
          anchor = node.parentElement?.closest("div,span");
          break;
        }
      }
    }
    if (!anchor) {
      console.warn(
        "[影评聚合] 未找到 IMDb 评分块。当前页面 rating 相关 testid：",
        [...document.querySelectorAll("[data-testid]")]
          .map((e) => e.getAttribute("data-testid"))
          .filter((t) => /rating/i.test(t)),
      );
      return;
    }

    const rating = Number(data.rating.average);
    const ratingStr = Number.isFinite(rating)
      ? rating.toFixed(1)
      : data.rating.average;

    // 5) 克隆原生评分块，风格 100% 继承 IMDb
    const clone = anchor.cloneNode(true);
    clone.id = "movie-rating-integrator-douban";
    clone.removeAttribute("aria-label");
    clone.style.cursor = "pointer";
    clone.title = `豆瓣：${data.title}（${ratingStr}）`;

    // 分数节点：先按 testid（宽松匹配），再按 "x.x/10" 文本兜底
    let score = qs('[data-testid*="aggregate-rating__score"]', clone);
    if (!score) {
      const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (/^\s*\d\.\d(\s*\/\s*10)?\s*$/.test(node.textContent)) {
          score = node.parentElement;
          break;
        }
      }
    }
    if (!score) {
      console.warn("[影评聚合] 克隆块内未找到分数节点，放弃克隆");
      return;
    }
    score.textContent = `豆瓣 ${ratingStr}/10`;

    // 进度条按豆瓣比例填充
    const fill = qs(
      '[data-testid*="bar-partial"], [class*="filled"], [class*="bar__partial"]',
      clone,
    );
    if (fill && Number.isFinite(rating)) {
      fill.style.width = `${Math.min(rating * 10, 100)}%`;
    }

    // 移除克隆体里指向 IMDb 评分页的链接，避免误导
    qsa("a[href*='ratings']", clone).forEach((n) => n.remove());

    clone.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.open(data.url, "_blank", "noopener");
    });

    (anchor.parentElement || anchor).appendChild(clone);
    console.log("[影评聚合] 已插入豆瓣评分:", ratingStr, data.url);
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
