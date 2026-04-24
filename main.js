// ─── Helpers ────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

const getHTML = url => fetch(url).then(r => r.text());

const parseDoc = html => new DOMParser().parseFromString(html, 'text/html');

async function batchProcess(items, limit, fn) {
    const results = new Array(items.length).fill(null);
    let idx = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (idx < items.length) {
            const i = idx++;
            results[i] = await fn(items[i], i);
        }
    });
    await Promise.all(workers);
    return results;
}


// ─── Button ──────────────────────────────────────────────────────────────────

function injectButton() {
    if ($('#frs-btn').length) return;

    const btn = $(`
        <button id="frs-btn" style="
            background: #2c3440;
            color: #99aabb;
            border: 1px solid #456;
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 13px;
            cursor: pointer;
            margin-bottom: 16px;
            display: block;
            transition: background 0.2s, color 0.2s;
        ">⭐ Sort by friends avg rating</button>
    `);

    btn.on('mouseenter', () => btn.css({ background: '#3c4a58', color: '#cde' }));
    btn.on('mouseleave', () => btn.css({ background: '#2c3440', color: '#99aabb' }));

    btn.on('click', () => {
        btn.prop('disabled', true).css({ opacity: 0.5, cursor: 'default' });
        main();
    });

    $('ul.poster-list, .film-list').first().before(btn);
}


// ─── Status Panel ────────────────────────────────────────────────────────────

function showStatus(msg, progress = null) {
    let panel = $('#frs-panel');
    if (!panel.length) {
        panel = $(`
            <div id="frs-panel" style="
                background: #2c3440;
                color: #99aabb;
                padding: 12px 16px;
                margin-bottom: 16px;
                border-radius: 4px;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 12px;
            "></div>
        `);
        $('ul.poster-list, .film-list').first().before(panel);
    }

    let inner = `<span style="flex-shrink:0;">${msg}</span>`;
    if (progress !== null) {
        inner += `
            <div style="flex:1; background:#445; border-radius:2px; height:4px; overflow:hidden;">
                <div id="frs-bar" style="
                    background: #00c030;
                    width: ${progress}%;
                    height: 100%;
                    border-radius: 2px;
                    transition: width 0.3s;
                "></div>
            </div>
            <span id="frs-pct" style="flex-shrink:0; font-size:11px;">${Math.round(progress)}%</span>
        `;
    }
    panel.html(inner);
}

function updateProgress(done, total) {
    const pct = Math.round((done / total) * 100);
    $('#frs-bar').css('width', pct + '%');
    $('#frs-pct').text(pct + '%');
    $('span', '#frs-panel').first().text(`Fetching friends ratings… (${done} / ${total})`);
}


// ─── Step 1: Get logged-in username ──────────────────────────────────────────

async function getUsername() {
    // Wait up to 5s for the nav to be available
    for (let i = 0; i < 50; i++) {
        if ($('.main-nav').length) {
            // Try to find the profile link in the account dropdown
            const profileLink = $('a[href]:contains("Profile")').filter(function () {
                return $(this).attr('href')?.match(/^\/[^/]+\/$/) !== null;
            }).first();
            const user = profileLink.attr('href');
            if (user) return user; // e.g. "/username/"

            // Fallback: nav account toggle link
            const accountLink = $('.nav-account a.toggle-menu').attr('href');
            if (accountLink && accountLink !== '#') return accountLink;

            return null;
        }
        await sleep(100);
    }
    return null;
}


// ─── Step 2: Collect all film slugs from the list (all pages) ────────────────

async function getAllFilms() {
    const films = [];
    const baseUrl = window.location.href.replace(/\/page\/\d+\/?/, '/');
    let url = baseUrl;

    while (url) {
        const html = await getHTML(url);
        const doc = parseDoc(html);
        doc.querySelectorAll('.react-component[data-item-slug]').forEach(el => {
            const slug = el.getAttribute('data-item-slug');
            if (slug && !films.includes(slug)) films.push(slug);
        });

        const nextEl = doc.querySelector('a.next');
        url = nextEl ? 'https://letterboxd.com' + nextEl.getAttribute('href') : null;
    }

    return films;
}


// ─── Step 3: Fetch friends ratings for one film ───────────────────────────────

async function getFriendsAvg(user, slug) {
    const ratings = [];
    let url = `https://letterboxd.com${user}friends/film/${slug}`;

    while (url) {
        const html = await getHTML(url);
        const doc = parseDoc(html);

        doc.querySelectorAll('tbody tr').forEach(row => {
            const person = row.querySelector('.name')?.getAttribute('href');
            if (person === user) return; // skip self

            const ratingEl = row.querySelector('.rating');
            const cls = ratingEl?.getAttribute('class') || '';
            if (cls.includes('rated-')) {
                const val = Number(cls.split('rated-')[1]);
                if (!isNaN(val)) ratings.push(val);
            }
        });

        const nextEl = doc.querySelector('a.next');
        url = nextEl ? 'https://letterboxd.com' + nextEl.getAttribute('href') : null;
    }

    if (!ratings.length) return null;
    const avg = ratings.reduce((a, b) => a + b, 0) / (ratings.length * 2);
    return { avg: parseFloat(avg.toFixed(2)), count: ratings.length };
}


// ─── Step 4: Add a small badge onto each poster ───────────────────────────────

function addBadge(slug, data) {
    const poster = $(`.react-component[data-item-slug="${slug}"] .film-poster`);
    poster.find('.frs-badge').remove();

    const label = data ? `${data.avg.toFixed(1)} ★` : '–';
    const title = data
        ? `${data.count} friend rating${data.count !== 1 ? 's' : ''}`
        : 'No friend ratings';

    const badge = $(`
        <div class="frs-badge" title="${title}" style="
            position: absolute;
            bottom: 0; left: 0; right: 0;
            background: rgba(0,0,0,0.72);
            color: #fff;
            text-align: center;
            font-size: 10px;
            font-weight: bold;
            padding: 3px 0;
            pointer-events: none;
            line-height: 1;
        ">${label}</div>
    `);

    poster.css('position', 'relative').append(badge);
}


// ─── Step 5: Re-order the DOM ─────────────────────────────────────────────────

function sortList(filmData) {
    const list = $('ul.poster-list').first();
    const items = list.find('li').toArray();

    items.sort((a, b) => {
        const slugA = $(a).find('.react-component[data-item-slug]').attr('data-item-slug');
        const slugB = $(b).find('.react-component[data-item-slug]').attr('data-item-slug');
        const avgA = filmData[slugA]?.avg ?? -1;
        const avgB = filmData[slugB]?.avg ?? -1;
        return avgB - avgA;
    });

    list.append(items);
}


// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const user = await getUsername();

    if (!user) {
        showStatus('⚠️ Could not detect your Letterboxd username. Are you logged in?');
        $('#frs-btn').prop('disabled', false).css({ opacity: 1, cursor: 'pointer' });
        return;
    }

    showStatus('⏳ Loading film list…');
    const films = await getAllFilms();

    if (!films.length) {
        showStatus('⚠️ No films found on this list.');
        $('#frs-btn').prop('disabled', false).css({ opacity: 1, cursor: 'pointer' });
        return;
    }

    showStatus(`Fetching friends ratings… (0 / ${films.length})`, 0);

    const filmData = {};
    let done = 0;

    await batchProcess(films, 5, async (slug) => {
        const result = await getFriendsAvg(user, slug);
        filmData[slug] = result;
        done++;
        addBadge(slug, result);
        updateProgress(done, films.length);
    });

    sortList(filmData);

    const rated = Object.values(filmData).filter(Boolean).length;
    showStatus(`✓ Sorted ${films.length} films — ${rated} had friend ratings, ${films.length - rated} had none (moved to end)`);
}


// ─── Init ─────────────────────────────────────────────────────────────────────

// Wait for the poster list to appear, then inject the button
(async () => {
    for (let i = 0; i < 100; i++) {
        if ($('ul.poster-list, .film-list').length) {
            injectButton();
            return;
        }
        await sleep(100);
    }
})();
