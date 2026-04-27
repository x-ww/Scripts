// ==UserScript==
// @name         影评聚合
// @name:en      Movie Ratings
// @name:zh-CN   影评聚合
// @namespace    https://github.com/x-ww/MovieRatingIntegrator
// @version      1.2.0
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
// @homepageURL  https://github.com/x-ww/MovieRatingIntegrator
// @supportURL   https://github.com/x-ww/MovieRatingIntegrator/issues
// @updateURL    https://raw.githubusercontent.com/x-ww/Scripts/main/MovieRatingIntegrator/MovieRatingIntegrator.js
// @downloadURL  https://raw.githubusercontent.com/x-ww/Scripts/main/MovieRatingIntegrator/MovieRatingIntegrator.js
// @noframes
// @run-at       document-end
// ==/UserScript==
'use strict';

(() => {
    const GM_REQUEST = typeof GM !== 'undefined' && GM?.xmlHttpRequest
        ? GM.xmlHttpRequest
        : (typeof GM_xmlhttpRequest !== 'undefined' ? GM_xmlhttpRequest : null);
    const OMDB_KEYS = ['40700ff1', '4ee790e0', 'd82cb888', '386234f9', 'd58193b6', '15c0aa3f'];
    const DB_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf8' };
    const DB_KEY = 'apikey=0ab215a8b1977939201640fa14c66bab';
    const IMDB_TOP_STYLE_ID = 'movie-rating-integrator-top250-style';
    const DOUBAN_RECOVERED_TITLE = 'Rating recovered by script.';
    const host = location.hostname;

    const TOMATO_ICON_FRESH = 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAFBElEQVR4Aa2VA7TszBpEd6c7yfiY13q2bdu2bdu2bdu2bdtHGGei7u9l8Ju4tVaNsKtaieJsyA917djNjrzk9z/a/hzwKc6BDGdDpbo/e3i1es3NYPtrrX+1K0B0XAI8rUJtvKA6E+6J/9XV57/I9PX/mGX/A77D2ZQ6xRuFBzgAE+r6ngvO3ODoFVfuV58LyvZPvSs1zt+wP/3W/56YRPnuf3698xGgc45GIChvam/1KqsXnLnYwQvN3nTPhWeulXStIXO0kjb/+vh/zEVue/AZUvPi1f8kgx+ttT8GJGd7BABTvlm5/NX3vlEuM3/TxaUSTdH8+7d9yv/oUGsY6pecJlguMb8z2M7/3Pvd5k+3Pv/DP+y8D/jXWQYESgXXPDh7p/lbHnhcfqh6QV02DFKo4fhnU6hVNIcWNO4fEUEno1sExg2fcGvw73984l8v/M5vN98CJKcbMOXpmdtecvWljasu3fNif4459p+UPx30+f6NF9ChR9bLiaqG0PeY++uA+759g1rHsjal+d2hkJ9dosLar7ff88Wv/euRwPYpAspKlZ+8uvzWix1o3PFyu5YlrSAsrODpt1vk9/tC7vyONbpW+MpN5hkcrnCjLzS5ywe2yX2FlwstDd89EvCTne6HX/aX/90DiE4MeHh95glPm5t7fqWqyBYNa4s+67OGv84FfPlgmUN/6/O4r7ao/zvn+0XjN99/menA48kv/C9hIuRG4TswuaPvK17YbT4NeDaAdwE/uPADGtMPV3VNuuwTzfv8YUbzw1mffxrFdX/X5cH/TPCXA9pHQq7Ycdzxg9sMrBCXNZ5jpMyDQRHqKcV9a1MP/fygf/HCmJuUardaDM2yqiqkoalO+1y3EXD9IMTzFH7FJ1tIiHQKqdCZN1z5rwl/+GWfqKKY3RUEheIkzXt64abl6q2BX5orh+Wr4wMlUKGCqoaZMt5CHVUyJO2EfLODF+dQUtgSeL7H5X4VQS6Id0o4gAOuGJavCWD2G3MIBSiFGAWeQrRGygGqXoIhWHuFx9+pwkkAB9YzlIJMn4SXCTxFmNFmH4ApKVXCAVYgH1uSDNcejJ/7KZLZwoLkbvw9inIuoECGhglCSIFYhIE4H8A0rdtdzlklFlQkSD9HBTHWOZTWSJpDO0H1LcQCiYCVERg1AU9aJwgRMED4n827AOZ3efLrC2bBRaQn2HaGNuDsMCxHlMLlDgq4a2fQdhAJOBA1BmeT1hHD1kJfHD3n+FUa/xbAfDmOPnvrSv2O0negwUqOShwq9MBTkDskLty20BRcIghCJpw0HQzBhZ2li9DKUr4fDz4zCeh/7odp/N3LB6Ur03GQgnQtEqoTA4hB+oIkQgYjeMKkNePWXWfp2Jx2nvHrOPrRr7Pk0wAK4CrFlnrX3MrHpjxvGgAP0JOvRRAL1o3hyaR1xLCxG8HbtoC7bNR8LYk7n8iy2wJfOsXF7o7Vxj1eOr3w+lCpEsJIMrKQAhlCDEQiI/ecK2xpuXHrVhKzlSXZ16x9MPDm071c36Rcu9XTp+ZecNj4xxyQTxYxnrTuU1gsPetonwDOEpppwj/z/G8/FnkS8MEzveEcMv7R+9amH3bdcuWWs57ZOxA32R1CT9x4ngu38rQAx/w3zf73B3Gf+BO8Cvjj6d9wTkdHjH+BS4Wla1zQhFde0PqCGuaK9n4zy9LNLGn+O0//8A/rvrsG3wB+xxno/+N5rMoDguFXAAAAAElFTkSuQmCC';
    const TOMATO_ICON_ROTTEN = 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAFZ0lEQVR4Ac1UA5Qj7RYMhwjGtk10upOsbTtr28YoM6uxbRtr29Zv22a9O3q265w6za+uwPtr0Jfo+npGWmuDBzsUmDmYTOYL+GLevwsSCwNmbVzQq02XGbRcZZBWF/VDgMoumc/ni/51dT5PMGK2e8uJ+yR+TYHGSyw6bjI4Uhn9i8zGaNi/rC/SEZqu14a+X3eRRWEnsYNFEV2zmxVwCTRf+fv/CsVCqaFcP5zS6ScQ8vX+qrCugdhW31jHpfvHiUt8LpWdYJHZqEBmgwLZTQoklSpg5Sqd1v+/qZ3xcM3G0GuZdWO+0BYM/yh0iFO+SFdo9mfFnfzMVmw7EvLGnszwDwKUtomWzpJpuzKivslq4nC4gkV6HYcFO0Le0zEQ2/MIBjK9wPXaqPcbLo6hGo3H2YfTUXFyAryibVP+RNzS0WRIZn3El513GFSeY5Fcx/5q7iSZbOYombJOG/nN0SolDpVzCB7kkNt/xj3Mam9KtZLqokRqjRpZTYNRc3Ykxi8JfC4QCoz/wECI0mpj01UFyk+zyGjhkNKoQuQo57Ie426yhTvSGRJRImK4U1FPjcRCySiN14XDFRwSilloiXRFer0KU9YEfUx1sfnD9PjI55SdYlByksORWhZJ5PHymIiPKYopcnuTieuTon44WsVhV2b096M1nikAL/O9ElvA/qIt5ZBUxuJgGaWxkkgRRY/1eEbz8ocRiPVEVpOW+1zKP9brfWwJBy0d2put+GVnGvNrQhGLeGJiCQvyGgeJ9B1JNSpoy5WIp/9jCllM3xAKmbXxvj8/tdQ9oUMcMpfFhn+SSIdIDIml5F05RwIs4sjb35LEY4hT14ciYqTHNz6MwzOXQOsrEkvDWPJewvtroC6xDVDbpx8oYn89VMshsYolT8nbavK8pptKpDQpsSE5Guau8nahjtCFz+cJe8bzr4EicLawN2KlFgbBFtSiW1Ijv87q4JDazCGtpY/NbM81o40MVzJQTHA7ae4snSqxMlLrmeh6UfcY/NnF4BxovnZ5TMhre3Iiv9qaFvHpgaLo7zNau0XZPnJIb+0mS+IsyDByqV5ZnQrElDDYmBL5w+xtQW+rpnlesPSQL/+DiZbbGY/clhb+Sd7xnoPE3mtmO4ucrl5vM0k0u5Mj0to4zaH8ghJVl1WouqRG3dXBaLk1DJ33RuH4gwlIrh4OP7VDqUDUF03wEMei5AYFCfaIEVnkHe8VyyCPS86qUHpWjfLzA9F4YyjiC5U/RI5wur5iT8T7px9NxenHM3DmyWycfzYXF15ocOe1xcisHQtbP/NtNO2hPEtX6ZyY4sivKy5wKD6jQs1lNfI6VVBO9bjoq7TPT6sf/N3Jx5Nw/P5UXH5pDtbsY94X6QlDdQzF0Zu0qvdvv7oYF19aiEsvLcD55wt6ruceaDBoms81O1/z/bzu/R400P5o0fEhaL89FmUnR4MZ59ZG3SEX6Yls1sYwL918ZSF5Nx/XX1mEmhNTYOko2csjWHuaripun4irLy9A15056LgxG81XZhCnY8zCwFfdI2xo8gnd+bJykU4KG+gQa+9lqhGKBEa9q1hgsmBz+PUbJHz2iQZnHmsoCg0mzA19nb65dDvHjHPvKOmaiOKuSUij1CRXjcburEHwYR0vmzlIdvH+FlQTPKpPPZiD1qszUHd+CkU5HbNWRf1I0z+gp72pPQfO8Lm3PFaBRfsZTN8agbCRbu/pGekMobY1/5sGTCwN1Uv2Mh/HFQ3r8WzO+mjYeZi108TKfn84bbzNdjr4W5abOUgTxboiP94/AjIyyD3KrtMl2OaWsZnBnh7P/p0QUcGltiarjC0MD4j1hNG8/yf8BrCAoJdN16WUAAAAAElFTkSuQmCC';
    const TOMATO_USER_ICON_POSITIVE = 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAFK0lEQVR4AZTNQ4DsWAAF0JsXFJIygm/btm3btoXN2LZt27bRtm2nKprGdlr3mYegndA0ocMhV5gQilzdO+CmJ25c9uonL556dtwIaSLQEo/b4aUag/9Ju8CC2SMXvvP8kQ/uuW7Vfdu3bdkxdfLkWZNHKdPO7Z5288wJvRY8eOuORy4cmn4ZgNUpQJF8XWZM6DH7zMEFF7o52bFrZvQ53G/kVNnrZ4WqyiJj0crVM568afkbC4bZ9nf30SMH9vYM7TDg8/C+2y/NffiFOzZ8On6oNM0VFk04esLUSmCodfaKzDRaL/sFvoCd93Xvj5lzV8zZu2XCoQ4BTo7hH7pp3RMrlk9f6g0rdF3BP+AYjYS72VGUGgPG0hES/SgvZlBTrsGqL4TXU0sU0d6dt3N8m4AblOeOwd0fmT1JWuUMjQYIi/rKepSn/IyKrBgwQg9wPAOV6Ql/r/7wSjx0tQJ15dWYMm7IotsPL76Xp2mhVWC34D2y4uj0LXzXYdCqs2GoVRBHzIKnx1BUF1fBrImBFjUg9ekFWktDpLYCFiuDYRlYhKLnDnLt3m8XTrYKjAczla7gYA/2hIpy1FQVorqkGLSgINyrJyJVpYCpw2YzQTu6gqK8cCsKNLMIzpAXLkcAM3jHvFaBCEEDc9fnqNx9A7TPEsDWmjDqMgEOYCUFoVETUakZSE7JBngB4AREc9Nh/ZgG9sbPYLv6PqKa2dAqkMLR8XB5YL70O6wz74E++gmc1/6GyOnXoF33HYw7f4brmVgID/4I9fRLIOc+gLbrbXDXJUB7NgYmKyCGpf9qFUiHlSo8fDfI0H6wiAVU69C/y4P2bgzURz5Bwy3vgn74ezje/hvW+3HQv4gBVanDpCyQwb3geuRupFpmYqtAXl1NTtTnjRBZApFEuF9+GsL9N4MKCiDdJNj3bodt72ZYXYCAR2g8u63xzjMgsghalhAN+CK5tTU5rQIFqppXEBtbClEEGlQwo0bAcWAvYLM3IgEI99zW2O4AFQoBNq7prPHOyP8qK4cEWK4Aip42Y3tFyR5CDJNRsImY09j2t+2wzVJbVY+prmnQSfHp3vMEbBhiY4175dexE4bDfwRMYdKv1R3uvhOzXKA8H2MtqVwOKxUYk7wIBfl8EtZ+gFkssbGmX/vDmcL4HwELa+f9334fmttvwypJNJsjUylMoZjErbFYazBSYotFVDqNms0wSmBjTffX3wdbj3/bKsJWo97W112HtaCnUyRgSwWMUmhrURa01glAA2I6QxnLVtOp1zrA5t8A1Pv9miqXkPkCejzBAKZcTEz11sgatJLoUikB6MkUlSsgqxVqg/4fOze77mTSWksp1DVXI12PxKRYRmuJwiSQBBZDJSA8DxOXDYUQncm4uRMwULI38YOZufEGhOsiAV0uoZRBaoNKAApVKiKAyHFRcdlpMFoMpRzsBDgi6nmDgW/vuQfpeFjAlEoordFSIqVAJi0ooxOAA/fchT8ceI4QvZ2AhWXS/O67YD0eI6OQDKCvvZZIa1Q6g8pkENpgr7mWJC/cEE4m1L75NphZO9oJAKKfzp/73Dt5kmWrzeqzL5GLBWo7XZ0hdjjEpMAs5qzjvFWzjXfyFHvOn/sCiP4LgO/Wq9ffN+L5oF4T/UceZ/X9D6TSsHzgYRYPPJQA5j/8RPfRx/HjMh8Z+eK369Wr/+fQX705Dp58ehrc+7YMXz6wWR88G4U/n2+1m6earT+OhZuzezerve+J8JVnp8F9b4z9J4DV3xn9CYgbvHRBBzqoAAAAAElFTkSuQmCC';
    const TOMATO_USER_ICON_NEGATIVE = 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAEXklEQVR4Ae2UQ6MjWRiG33NOpVJIUhX7KpdtjW3btpfzG2Y9mxE2Y9tm27Z9jSRlTKaGbaz7LfP5jBM6kgiOQ5SCyxTFCeOnpa9L5sOtS2b2vw7gexxE3GHpFEwQOSUS4zOpjFpKZ5XmbE5tbatUWjip2gZhRw+ciBKLRcd/8/76YQALD+sBH2aR7smpyxvfd2Tz6VJzU1ux0trekkwlE+lkTpEkWTbtKtGMUSxa/wH29m3Gip+SsHSKbPeueW89t/JyAEMHBSTSQuW6+5tePfusc87oKJ0Lx7VQ1QYwPLYLo7VeaMYQdHMMrufAhw9BYujfImPl7zI8l6BtiubPn7PkTgBvHQAgBPS2J7o/PPW8wrXETsL3AI6FIAoKZFFBTM4iKmcgNc55TsacFW9i9+AibFqQwe6NPBgF5LgNHWtfBPDoPjkIiyxWaIpMa+4MnT2t63JMb38UPjzwnADWgOyvmjaE35a8ANsGasMMjPoglMDQGMS00PnF2xsUAKP/Alo6Yme19agXqaqY6O3rxXztUxjWGCy7Bt2swrQ12LYRbI5nw3bq0N29IE4EpkZAGAAgCBPxWJLjiLQPIF2QxmcL0kT4PFatmwutPhOUAoRQUMYQHAkJzhnh4MMGEz24dgi+R0EI4CPYAT4VKSP7uM01SjArRbhUrabjunOfQnvTGbBtG5RSMEIARkB8EkD4sIB122bhk9+ehO+GIIoyQHzADwBgjOcIAdsHYFtu3bY93bE89A/ugcRvhuvaoIwDoyzYaLBRCEIMtfoIPN8DYRxURQGhPnxQ+B6BSTkfjWUfQHXE2l0btXdnCyK+/vVpGIYZWEUaG0BAKQEJQkRBwMCFGGQlFHgkRRX4YKAE4BqgvjqxPM939gEM9hoblYTWUqpwmDHpBkysXIKRai8MqwbTqsO2dZh2HYb5Z+J1GNYoeodXgcLGxHYeYeZAtxXsHCLQBrQR1/GNfQDbN47NMgyn2j4+fJ9ujGQkMYGonIYgRMCHJHCcEPQECEGIA6q1Pjz79r0Yre3E2VNGkRHqsHgev65T4Lqt2rd0g3XQTr705uaXuyZGH5T4JCgNwXHNv5stCllqQKUkVKUQHOev+BBbdy3Hw1fciS41jj2bF4AQAeFkS+/Fd794NoD1+Fv/ZnzXlvpsQUa+p3ty1xnTb2PlwkSSTVQg8BEYZg39Q9uweccCrNn4E+raACyXQIaBKc05REsTURvYiWg8JYyf0Fnp7xvEgqVbN45VdYfsO4YJpyb5rkxO6Sw3FdtLTbm2YqnU1N7W1dwYd4lYLK6KgiQ2QomvZ74Es7oV908ahpbWqUDYgM8SQSn7zgC+XUA++fHXxT+Qo5n9gsipUYXPp9JqUyIdbS2VcxXGG20O65vQU0hHWtTSxrOnTu+CuUsaHBrarVaupG99OPPNWXOXzyI4ToVFFm/rjF1BeGRH99o/P3DLRVcrvB6fu3DtPCtU1mbNXTFzeGRsGCd0JP0BLHO0MJZ4Kw0AAAAASUVORK5CYII=';

    const isNA = value => value == null || value === '' || value === 'N/A';
    const qs = (selector, root = document) => root.querySelector(selector);
    const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

    function gmRequest(url, headers, data) {
        return new Promise(resolve => {
            if (!GM_REQUEST) {
                console.error('GM.xmlHttpRequest is unavailable.');
                resolve(undefined);
                return;
            }

            GM_REQUEST({
                method: data ? 'POST' : 'GET',
                url,
                headers,
                data,
                onload: response => {
                    if (response.status >= 200 && response.status < 400) {
                        resolve(response.responseText);
                        return;
                    }

                    console.error(`Error ${url}:`, response.status, response.responseText);
                    resolve(undefined);
                },
                onerror: response => {
                    console.error(`GM error ${url}:`, response.statusText || response);
                    resolve(undefined);
                }
            });
        });
    }

    async function gmJson(url, headers, data) {
        const text = await gmRequest(url, headers, data);
        if (!text) return undefined;

        try {
            return JSON.parse(text);
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
        return new Promise(resolve => {
            const existing = qs(selector);
            if (existing) {
                resolve(existing);
                return;
            }

            const observer = new MutationObserver(() => {
                const node = qs(selector);
                if (node) {
                    observer.disconnect();
                    resolve(node);
                }
            });

            observer.observe(document.documentElement, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                resolve(qs(selector));
            }, timeout);
        });
    }

    function compactNumber(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return value ?? '';
        return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(numeric);
    }

    function formatVoterCount(value) {
        return String(value ?? '').replace(/,/g, '');
    }

    function injectTop250Style() {
        if (document.getElementById(IMDB_TOP_STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = IMDB_TOP_STYLE_ID;
        style.textContent = '.top250{background:url(https://img1.doubanio.com/f/movie/f8a7b5e23d00edee6b42c6424989ce6683aa2fff/pics/movie/top250_bg.png) no-repeat;width:150px;font:12px Helvetica,Arial,sans-serif;margin:5px 0;color:#744900;display:inline-block}.top250 span{display:inline-block;text-align:center;height:18px;line-height:18px}.top250 a{color:#744900;text-decoration:none;background:none}.top250-no{width:34%}.top250-link{width:66%}';
        document.head.appendChild(style);
    }

    function buildMetacriticSlug(title) {
        return title
            .toLowerCase()
            .replace(/[:'".,?!&]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/^-+|-+$/g, '')
            .replace(/-(ii|iii|iv|v|vi|vii|viii|ix|x)$/, (_, roman) => (
                '-' + { ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' }[roman]
            ));
    }

    function buildTomatoIcon(base64) {
        return `background:url(data:image/png;base64,${base64}) no-repeat;background-size:cover;width:18px;height:18px;margin:0 2px;vertical-align:middle;display:inline-block`;
    }

    async function getIMDbInfo(id) {
        const key = OMDB_KEYS[Math.floor(Math.random() * OMDB_KEYS.length)];
        const [omdb, imdb] = await Promise.all([
            gmJson(`https://www.omdbapi.com/?tomatoes=true&apikey=${key}&i=${id}`),
            gmJsonp(`https://p.media-imdb.com/static-content/documents/v1/title/${id}/ratings%3Fjsonp=imdb.rating.run:imdb.api.title.ratings/data.json`)
        ]);
        const data = omdb || {};
        const resource = imdb?.resource;

        if (resource) {
            if (resource.rating) data.imdbRating = resource.rating;
            if (resource.ratingCount) data.imdbVotes = resource.ratingCount;
            if (resource.ratingsHistograms?.['IMDb Users']) data.histogram = resource.ratingsHistograms['IMDb Users'].histogram;
            if (resource.topRank) data.topRank = resource.topRank;
        }

        return data;
    }

    async function getDoubanInfo(id) {
        const direct = await gmJson(`https://api.douban.com/v2/movie/imdb/${id}`, DB_HEADERS, DB_KEY);
        if (direct && !isNA(direct.alt)) {
            return {
                url: `${direct.alt.replace('/movie/', '/subject/').replace(/\/?$/, '/')}`,
                rating: direct.rating,
                title: direct.title
            };
        }

        const suggestions = await gmJson(`https://movie.douban.com/j/subject_suggest?q=${id}`);
        const suggestion = suggestions?.[0];
        if (!suggestion?.id) return undefined;

        const abstract = await gmJson(`https://movie.douban.com/j/subject_abstract?subject_id=${suggestion.id}`);
        return {
            url: `https://movie.douban.com/subject/${suggestion.id}/`,
            rating: {
                numRaters: '',
                max: 10,
                average: abstract?.subject?.rate || '?'
            },
            title: suggestion.title
        };
    }

    function insertDoubanRating(parent, title, rating, link, numRaters, histogram) {
        const numericRating = Number(rating);
        const star = (5 * Math.round(numericRating)).toString().padStart(2, '0');
        const displayRating = Number.isFinite(numericRating) ? numericRating.toFixed(1) : rating;
        let histogramHtml = '';

        if (histogram && numRaters) {
            const histogramValues = Object.values(histogram);
            const max = Math.max(...histogramValues, 0);

            histogramHtml = '<div class="ratings-on-weight">' + Array.from({ length: 10 }, (_, index) => 10 - index).map(score => {
                const count = Number(histogram[score] || 0);
                const percent = numRaters ? (count * 100 / numRaters).toFixed(1) : '0.0';
                const width = max ? 64 / max * count : 0;
                return `<div class="item"><span class="stars${score} starstop" style="width:18px;text-align:center">${score}</span><div class="power" style="width:${width}px"></div><span class="rating_per">${percent}%</span><br></div>`;
            }).join('') + '</div>';
        }

        parent.insertAdjacentHTML('beforeend', `
            <div class="rating_logo">${title}</div>
            <div class="rating_self clearfix">
                <strong class="ll rating_num">${displayRating}</strong>
                <div class="rating_right">
                    <div class="ll bigstar${star}"></div>
                    <div style="clear:both" class="rating_sum">
                        <a href="${link}" target="_blank" rel="noopener noreferrer">${formatVoterCount(numRaters)}人评价</a>
                    </div>
                </div>
            </div>${histogramHtml}`);
    }

    function insertDoubanInfo(name, value) {
        const info = qs('#info');
        if (!info) return;

        if (info.lastElementChild?.nodeName !== 'BR') {
            info.insertAdjacentHTML('beforeend', '<br>');
        }

        info.insertAdjacentHTML('beforeend', `<span class="pl">${name}:</span> ${value}<br>`);
    }

    function linkify(node, base) {
        const id = node?.textContent?.trim();
        if (!id) return null;

        const anchor = Object.assign(document.createElement('a'), {
            href: base + id,
            target: '_blank',
            rel: 'noopener noreferrer',
            textContent: id
        });
        node.replaceWith(anchor);
        anchor.insertAdjacentText('beforebegin', ' ');
        return id;
    }

    function renderMetascore(container, data) {
        if (isNA(data.Metascore)) return;

        const metascore = parseInt(data.Metascore, 10);
        const color = metascore >= 60 ? '#6c3' : metascore >= 40 ? '#fc3' : '#f00';
        const pageTitle = (qs('h1')?.textContent?.trim() || document.title)
            .replace(/ - 豆瓣.*$/, '')
            .replace(/（.*/, '')
            .trim();
        const metaUrl = data.Title
            ? `https://www.metacritic.com/movie/${buildMetacriticSlug(data.Title)}/`
            : `https://www.metacritic.com/search/all/${encodeURIComponent(pageTitle)}/results`;

        container.insertAdjacentHTML('beforeend',
            `<br>Metascore: <a href="${metaUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none"><span style="background-color:${color};color:#fff;height:24px;width:24px;line-height:24px;vertical-align:middle;display:inline-block;text-align:center;font-weight:bold">${data.Metascore}</span></a>`);
    }

    function renderRottenTomatoes(container, data) {
        const rt = data.Ratings?.find(item => item.Source === 'Rotten Tomatoes');
        if (!rt?.Value) return;

        const fresh = parseInt(rt.Value, 10) >= 60;
        const tomatoUrl = (data.tomatoURL || '').replace('http://', 'https://');

        container.insertAdjacentHTML('beforeend',
            `<br><a href="${tomatoUrl}" target="_blank" rel="noopener noreferrer" style="background:none"><span style="${buildTomatoIcon(fresh ? TOMATO_ICON_FRESH : TOMATO_ICON_ROTTEN)}"></span></a><span style="vertical-align:middle;display:inline-block;line-height:18px">${rt.Value}</span>`);

        if (isNA(data.tomatoUserMeter)) return;

        const userPositive = parseFloat(data.tomatoUserRating) >= 3.5;
        container.insertAdjacentHTML('beforeend',
            `<a href="${tomatoUrl}" target="_blank" rel="noopener noreferrer" style="background:none"><span style="${buildTomatoIcon(userPositive ? TOMATO_USER_ICON_POSITIVE : TOMATO_USER_ICON_NEGATIVE)}"></span></a><span style="vertical-align:middle;display:inline-block;line-height:18px">${data.tomatoUserMeter}%</span>`);
    }

    function ensureRecoveredDoubanRating(dbId) {
        const subjectWrap = qs('.subjectwrap');
        const subject = qs('.subject');
        if (!subjectWrap || !subject) return null;

        const section = document.createElement('div');
        section.id = 'interest_sectl';
        subjectWrap.insertBefore(section, subject.nextSibling);

        const wrap = document.createElement('div');
        wrap.className = 'rating_wrap';
        section.appendChild(wrap);

        getDoubanInfo(dbId).then(data => {
            if (data?.rating && !isNA(data.rating.average)) {
                insertDoubanRating(
                    wrap,
                    '豆瓣评分',
                    data.rating.average,
                    `https://movie.douban.com/subject/${dbId}/collections`,
                    data.rating.numRaters
                );
            }
            wrap.title = DOUBAN_RECOVERED_TITLE;
        });

        if (qs('#movie-rating-iframe')) {
            section.style.marginTop = '96px';
        }

        return section;
    }

    async function handleDoubanMoviePage() {
        await waitForElement('#info');

        const dbId = location.href.match(/douban\.com\/subject\/(\d+)/)?.[1];
        let section = document.getElementById('interest_sectl');

        if (!section) {
            if (!dbId) return;
            section = ensureRecoveredDoubanRating(dbId);
            if (!section) return;
        }

        if (document.getElementById('movie-rating-integrator-extra')) return;

        const imdbLabel = qsa('#info > span.pl').find(node => node.innerText.trim() === 'IMDb:');
        const imdbNode = imdbLabel?.nextSibling;
        if (!imdbNode) return;

        const imdbId = linkify(imdbNode, 'https://www.imdb.com/title/');
        if (!imdbId) return;

        const data = await getIMDbInfo(imdbId);
        if (!data || (isNA(data.imdbRating) && isNA(data.Metascore))) return;

        const ratings = document.createElement('div');
        ratings.id = 'movie-rating-integrator-extra';
        ratings.className = 'rating_wrap clearbox';
        ratings.style.cssText = 'padding:15px 0;border-top:1px solid #eaeaea;';

        const ratingWrap = qs('.friends_rating_wrap') || qs('.rating_wrap');
        section.insertBefore(ratings, ratingWrap?.nextSibling || null);
        section.style.marginBottom = qs('.colbutt') ? '-136px' : '-154px';

        const recommendation = qs('.rec-sec, #interest_sect_level');
        if (recommendation) {
            recommendation.style.width = '488px';
        }

        if (!isNA(data.imdbRating)) {
            insertDoubanRating(
                ratings,
                'IMDb评分',
                data.imdbRating,
                `https://www.imdb.com/title/${imdbId}/ratings`,
                data.imdbVotes,
                data.histogram
            );

            if (!isNA(data.topRank) && data.topRank <= 250 && !qs('.top250')) {
                injectTop250Style();
                (document.getElementById('dale_movie_subject_top_icon') || qs('h1'))?.insertAdjacentHTML(
                    'beforebegin',
                    `<div class="top250"><span class="top250-no">No.${data.topRank}</span><span class="top250-link"><a href="https://www.imdb.com/chart/top">IMDb Top 250</a></span></div>`
                );
            }
        }

        renderMetascore(ratings, data);
        renderRottenTomatoes(ratings, data);

        if (!isNA(data.Rated)) insertDoubanInfo('MPAA评级', data.Rated);
        if (!isNA(data.BoxOffice)) insertDoubanInfo('票房', data.BoxOffice);
    }

    function handleDoubanPersonPage() {
        const node = qsa('span.value').find(item => /^nm\d+/.test(item.innerText.trim()));
        if (node) {
            linkify(node, 'https://www.imdb.com/name/');
        }
    }

    async function handleImdbPage() {
        await waitForElement('.rating-bar__base-button');

        const id = location.href.match(/tt\d+/)?.[0];
        if (!id || document.getElementById('movie-rating-integrator-douban')) return;

        const data = await getDoubanInfo(id);
        if (!data) return;

        const imdbButton = qs('.rating-bar__base-button');
        if (!imdbButton?.parentElement) return;

        const button = imdbButton.cloneNode(true);
        button.id = 'movie-rating-integrator-douban';

        const firstChild = button.firstElementChild;
        if (firstChild) firstChild.textContent = 'Douban RATING';

        button.href = data.url;
        button.target = '_blank';
        button.rel = 'noopener noreferrer';
        button.title = data.title;

        const scoreContainer = qs('div[data-testid="hero-rating-bar__aggregate-rating__score"]', button);
        if (!scoreContainer?.firstElementChild) return;

        scoreContainer.firstElementChild.textContent = data.rating.average;
        const numElement = scoreContainer.nextElementSibling?.nextElementSibling;
        if (numElement) {
            numElement.textContent = compactNumber(data.rating.numRaters);
        }

        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            window.open(data.url, '_blank', 'noopener');
        });

        imdbButton.parentElement.insertAdjacentElement('afterbegin', button);
    }

    function init() {
        if (host === 'movie.douban.com') {
            handleDoubanMoviePage();
        } else if (host === 'www.douban.com') {
            handleDoubanPersonPage();
        } else if (host === 'www.imdb.com') {
            handleImdbPage();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
