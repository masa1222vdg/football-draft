/* =========================================================
   Football Historical Draft v2
   ① 条件強化
   ② 候補戦略化
   ③ ケミストリー強化
   ④ ドラフト中アドバイス
   ========================================================= */

let players = [];
let drafted = [];
let usedPlayerIds = new Set();
let usedConditionKeys = new Set();

let skips = 3;
let draftCount = 0;
let formation = "4-3-3";
let currentCondition = null;


/* =========================================================
   DOM
   ========================================================= */

const idAliases = {
    formationSelect: ["formation-select", "formationSelect"],
    startBtn: ["start-button", "startBtn"],
    skipBtn: ["skip-button", "skipBtn"],
    restartBtn: ["restart-button", "restartBtn"],

    startScreen: ["start-screen", "startScreen"],
    draftScreen: ["draft-screen", "draftScreen"],
    finalScreen: ["final-screen", "finalScreen"],

    draftCount: ["draft-count", "draftCount"],
    skipCount: ["skip-count", "skipCount"],
    currentFormation: ["current-formation", "currentFormation"],
    neededPosition: ["needed-position", "neededPosition"],

    condition: ["condition-text", "condition", "conditionText"],

    candidates: ["candidate-list", "candidates"],
    draftedList: ["drafted-list", "draftedList"],

    strategyMessage: ["strategy-message", "strategyMessage"],

    teamScore: ["team-score", "teamScore"],
    teamRank: ["team-rank", "teamRank"],
    playerScore: ["player-score", "playerScore"],
    chemistryScore: ["chemistry-score", "chemistryScore"],
    comboScore: ["combo-score", "comboScore"],
    formationScore: ["formation-score", "formationScore"],

    finalPlayers: ["final-player-list", "finalPlayers"],

    pitch: ["pitch"]
};

function $(name) {
    const ids = idAliases[name] || [name];

    for (const id of ids) {
        const element = document.getElementById(id);
        if (element) return element;
    }

    return null;
}


/* =========================================================
   Formation
   ========================================================= */

const formations = {
    "4-3-3": [
        ["GK", 1],
        ["DF", 4],
        ["MF", 3],
        ["FW", 3]
    ],

    "4-4-2": [
        ["GK", 1],
        ["DF", 4],
        ["MF", 4],
        ["FW", 2]
    ],

    "4-2-3-1": [
        ["GK", 1],
        ["DF", 4],
        ["MF", 5],
        ["FW", 1]
    ],

    "3-5-2": [
        ["GK", 1],
        ["DF", 3],
        ["MF", 5],
        ["FW", 2]
    ],

    "3-4-3": [
        ["GK", 1],
        ["DF", 3],
        ["MF", 4],
        ["FW", 3]
    ],

    "4-1-4-1": [
        ["GK", 1],
        ["DF", 4],
        ["MF", 5],
        ["FW", 1]
    ]
};

const statKeys = [
    "pac",
    "sho",
    "pas",
    "dri",
    "def",
    "phy"
];


/* =========================================================
   Utility
   ========================================================= */

function esc(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}


/* =========================================================
   Team normalization
   ========================================================= */

function normalizeTeam(team) {

    const t = String(team || "")
        .trim()
        .toLowerCase();

    const map = {
        "fc barcelona": "barcelona",
        "barcelona": "barcelona",

        "real madrid cf": "real madrid",
        "real madrid": "real madrid",

        "manchester united fc": "manchester united",
        "manchester united": "manchester united",

        "manchester city fc": "manchester city",
        "manchester city": "manchester city",

        "fc bayern munich": "bayern munich",
        "bayern munich": "bayern munich",

        "inter milan": "inter",
        "internazionale": "inter"
    };

    return map[t] || t;
}


/* =========================================================
   CSV parser
   ========================================================= */

function parseCSV(text) {

    const rows = [];

    let row = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {

        const c = text[i];
        const next = text[i + 1];

        if (c === '"' && quoted && next === '"') {
            cell += '"';
            i++;
            continue;
        }

        if (c === '"') {
            quoted = !quoted;
            continue;
        }

        if (c === "," && !quoted) {
            row.push(cell);
            cell = "";
            continue;
        }

        if ((c === "\n" || c === "\r") && !quoted) {

            if (c === "\r" && next === "\n") {
                i++;
            }

            row.push(cell);
            cell = "";

            if (row.some(x => x.trim() !== "")) {
                rows.push(row);
            }

            row = [];
            continue;
        }

        cell += c;
    }

    row.push(cell);

    if (row.some(x => x.trim() !== "")) {
        rows.push(row);
    }

    if (rows.length === 0) {
        return [];
    }

    const headers = rows.shift().map(h => h.trim());

    return rows.map(r => {

        const obj = {};

        headers.forEach((h, i) => {
            obj[h] = (r[i] ?? "").trim();
        });

        return obj;
    });
}


/* =========================================================
   Player conversion
   ========================================================= */

function convertPlayer(p) {

    return {
        ...p,

        year: parseInt(p.year, 10),

        pac: num(p.pac),
        sho: num(p.sho),
        pas: num(p.pas),
        dri: num(p.dri),
        def: num(p.def),
        phy: num(p.phy),

        titleBonus: num(p.titleBonus),
        awardBonus: num(p.awardBonus)
    };
}


/* =========================================================
   Load CSV
   ========================================================= */

async function loadPlayers() {

    try {

        const response = await fetch(
            "players.csv?cache=" + Date.now()
        );

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const text = await response.text();

        players = parseCSV(text).map(convertPlayer);

        if (players.length < 100) {
            throw new Error(
                "選手数が少なすぎます: " + players.length
            );
        }

        console.log(
            `Football Draft: ${players.length} players loaded`
        );

    } catch (error) {

        console.error("CSV読み込みエラー:", error);

        alert(
            "players.csvを読み込めませんでした。\n\n" +
            "GitHub Pages上で開いているか確認してください。"
        );
    }
}


/* =========================================================
   OVR
   ========================================================= */

const positionWeights = {

    GK: {
        pac: .05,
        sho: .05,
        pas: .15,
        dri: .05,
        def: .30,
        phy: .40
    },

    DF: {
        pac: .15,
        sho: .05,
        pas: .15,
        dri: .10,
        def: .35,
        phy: .20
    },

    MF: {
        pac: .15,
        sho: .10,
        pas: .30,
        dri: .25,
        def: .10,
        phy: .10
    },

    FW: {
        pac: .25,
        sho: .30,
        pas: .15,
        dri: .25,
        def: .01,
        phy: .04
    }
};


function baseOVR(p) {

    return Math.round(
        statKeys.reduce(
            (sum, key) => sum + num(p[key]),
            0
        ) / 6
    );
}


function positionOVR(p, pos) {

    const weights =
        positionWeights[pos] ||
        positionWeights.FW;

    return Math.round(
        statKeys.reduce(
            (sum, key) =>
                sum + num(p[key]) * (weights[key] || 0),
            0
        )
    );
}


function positionCompatibility(p, pos) {

    const natural = String(
        p.naturalPosition ||
        p.position ||
        ""
    ).toUpperCase();

    if (natural === pos) {
        return 1;
    }

    const flex = {

        GK: [],

        DF: ["MF"],

        MF: ["DF", "FW"],

        FW: ["MF"]
    };

    if (
        (flex[pos] || []).includes(natural)
    ) {
        return .90;
    }

    return .78;
}


function finalOVR(p, pos) {

    return Math.min(
        100,

        Math.round(
            positionOVR(p, pos) *
            positionCompatibility(p, pos)

            +

            p.titleBonus * .7

            +

            p.awardBonus * .8
        )
    );
}


function bestPosition(p) {

    return [
        "GK",
        "DF",
        "MF",
        "FW"
    ].sort(
        (a, b) =>
            finalOVR(p, b) -
            finalOVR(p, a)
    )[0];
}


/* =========================================================
   ① Historical conditions
   ========================================================= */

function conditionKey(p) {

    return [
        p.source,
        p.year,
        normalizeTeam(p.team),
        p.tournament || ""
    ].join("|");
}


function buildConditions() {

    const map = new Map();

    players.forEach(p => {

        const key = conditionKey(p);

        if (!map.has(key)) {

            map.set(
                key,

                {
                    key,
                    source: p.source,
                    year: p.year,
                    team: p.team,
                    tournament: p.tournament || "",
                    players: []
                }
            );
        }

        map.get(key).players.push(p);
    });

    return [...map.values()];
}


function conditionLabel(c) {

    if (c.source === "NATIONAL") {

        return `${c.year} ${c.team}` +
            `${c.tournament ? " — " + c.tournament : ""}`;

    }

    return `${c.year} ${c.team}`;
}


function pickCondition() {

    const all = buildConditions();

    let available =
        all.filter(
            c =>
                !usedConditionKeys.has(c.key) &&
                c.players.some(
                    p => !usedPlayerIds.has(p.id)
                )
        );

    if (!available.length) {

        usedConditionKeys.clear();

        available =
            all.filter(
                c =>
                    c.players.some(
                        p => !usedPlayerIds.has(p.id)
                    )
            );
    }

    if (!available.length) {
        return null;
    }

    const rich =
        available.filter(
            c =>
                c.players.filter(
                    p => !usedPlayerIds.has(p.id)
                ).length >= 3
        );

    const pool =
        rich.length ? rich : available;

    const clubs =
        pool.filter(
            c => c.source === "CLUB"
        );

    const nations =
        pool.filter(
            c => c.source === "NATIONAL"
        );

    let selected = pool;

    if (Math.random() < .5 && clubs.length) {

        selected = clubs;

    } else if (nations.length) {

        selected = nations;
    }

    const condition =
        selected[
            Math.floor(
                Math.random() * selected.length
            )
        ];

    usedConditionKeys.add(condition.key);

    return condition;
}


/* =========================================================
   ② Needed positions
   ========================================================= */

function neededPositions() {

    const slots =
        formations[formation] ||
        formations["4-3-3"];

    const current = {};

    drafted.forEach(player => {

        const best = bestPosition(player);

        current[best] =
            (current[best] || 0) + 1;
    });

    const need = [];

    slots.forEach(([position, count]) => {

        const missing =
            Math.max(
                0,
                count - (current[position] || 0)
            );

        for (let i = 0; i < missing; i++) {
            need.push(position);
        }
    });

    return need;
}


function updateNeededPosition() {

    const element = $("neededPosition");

    if (!element) return;

    const needed = neededPositions();

    element.textContent =
        needed.length
            ? needed[0]
            : "自由枠";
}


/* =========================================================
   ③ Chemistry
   ========================================================= */

function chemistryScore(team) {

    if (team.length <= 1) {
        return 0;
    }

    let score = 0;

    const nations = {};
    const clubs = {};
    const contexts = {};

    team.forEach(p => {

        nations[p.nationality] =
            (nations[p.nationality] || 0) + 1;

        const club =
            normalizeTeam(p.team);

        clubs[club] =
            (clubs[club] || 0) + 1;

        const context =
            club + "|" + p.year;

        contexts[context] =
            (contexts[context] || 0) + 1;
    });

    Object.values(nations).forEach(n => {

        if (n >= 2) {

            score += Math.min(
                8,
                (n - 1) * 2
            );
        }
    });

    Object.values(clubs).forEach(n => {

        if (n >= 2) {

            score += Math.min(
                8,
                (n - 1) * 2
            );
        }
    });

    Object.values(contexts).forEach(n => {

        if (n >= 2) {

            score += Math.min(
                10,
                (n - 1) * 3
            );
        }
    });

    return Math.min(30, score);
}


/* =========================================================
   Special combos
   ========================================================= */

const comboDefs = [

    {
        names: [
            "Lionel Messi",
            "Xavi",
            "Andrés Iniesta"
        ],
        bonus: 10,
        label: "🔥 Barcelona 黄金トリオ"
    },

    {
        names: [
            "Lionel Messi",
            "Neymar",
            "Luis Suárez"
        ],
        bonus: 10,
        label: "🔥 MSN"
    },

    {
        names: [
            "Cristiano Ronaldo",
            "Karim Benzema",
            "Luka Modrić"
        ],
        bonus: 10,
        label: "🔥 Madrid 黄金トリオ"
    },

    {
        names: [
            "Xavi",
            "Andrés Iniesta",
            "Sergio Busquets"
        ],
        bonus: 9,
        label: "🔥 Barcelona 中盤トリオ"
    },

    {
        names: [
            "Paolo Maldini",
            "Andrea Pirlo",
            "Gennaro Gattuso"
        ],
        bonus: 8,
        label: "🔥 Milan 黄金期"
    },

    {
        names: [
            "Kaká",
            "Ronaldo",
            "Roberto Carlos"
        ],
        bonus: 7,
        label: "🔥 Brazil / Madrid"
    },

    {
        names: [
            "Thierry Henry",
            "Patrick Vieira",
            "Robert Pirès"
        ],
        bonus: 7,
        label: "🔥 Arsenal 黄金期"
    },

    {
        names: [
            "Zinedine Zidane",
            "Ronaldo",
            "Roberto Carlos"
        ],
        bonus: 7,
        label: "🔥 Galácticos"
    },

    {
        names: [
            "Ronaldinho",
            "Samuel Eto'o",
            "Deco"
        ],
        bonus: 6,
        label: "🔥 Barcelona 2000s"
    }
];


function comboScore(team) {

    let total = 0;

    const labels = [];
    const progress = [];

    comboDefs.forEach(combo => {

        const count =
            combo.names.filter(
                name =>
                    team.some(
                        p =>
                            p.name.toLowerCase() ===
                            name.toLowerCase()
                    )
            ).length;

        if (
            count === combo.names.length
        ) {

            total += combo.bonus;

            labels.push(
                `${combo.label} +${combo.bonus}`
            );

        } else if (count >= 2) {

            progress.push(
                `${combo.label} ${count}/${combo.names.length}`
            );
        }
    });

    return {
        total: Math.min(30, total),
        labels,
        progress
    };
}


/* =========================================================
   Candidate strategy
   ========================================================= */

function candidateNeedScore(p) {

    const needed =
        neededPositions()[0];

    const fit =
        needed
            ? positionCompatibility(
                p,
                needed
            )
            : 1;

    let chemistry = 0;

    drafted.forEach(x => {

        if (
            x.nationality ===
            p.nationality
        ) {
            chemistry += 2;
        }

        if (
            normalizeTeam(x.team) ===
            normalizeTeam(p.team)
        ) {
            chemistry += 2;
        }

        if (
            x.year === p.year &&
            normalizeTeam(x.team) ===
            normalizeTeam(p.team)
        ) {
            chemistry += 2;
        }
    });

    return (
        finalOVR(
            p,
            bestPosition(p)
        ) * .65

        +

        fit * 20

        +

        chemistry * 2
    );
}


function getCandidateRole(p, index) {

    const needed =
        neededPositions()[0];

    if (
        needed &&
        bestPosition(p) === needed &&
        positionCompatibility(
            p,
            needed
        ) >= .95
    ) {
        return "🔥 最優先！";
    }

    if (
        candidateNeedScore(p) >= 78
    ) {
        return "⭐ 強力候補";
    }

    if (index === 2) {
        return "💎 隠れた当たり";
    }

    return "⚡ バランス型";
}


/* =========================================================
   Candidate chemistry preview
   ========================================================= */

function previewChemistry(p) {

    let nation = 0;
    let club = 0;
    let context = 0;

    drafted.forEach(x => {

        if (
            x.nationality ===
            p.nationality
        ) {
            nation++;
        }

        if (
            normalizeTeam(x.team) ===
            normalizeTeam(p.team)
        ) {
            club++;
        }

        if (
            x.year === p.year &&
            normalizeTeam(x.team) ===
            normalizeTeam(p.team)
        ) {
            context++;
        }
    });

    return {
        nation,
        club,
        context
    };
}


/* =========================================================
   Get 3 candidates
   ========================================================= */

function getCandidates(condition) {

    const eligible =
        condition.players.filter(
            p =>
                !usedPlayerIds.has(p.id)
        );

    if (eligible.length <= 3) {
        return eligible;
    }

    const ranked =
        [...eligible].sort(
            (a, b) =>
                candidateNeedScore(b) -
                candidateNeedScore(a)
        );

    const first =
        ranked[0];

    const second =
        ranked.find(
            p =>
                bestPosition(p) !==
                bestPosition(first)
        ) || ranked[1];

    const rest =
        ranked.filter(
            p =>
                p.id !== first.id &&
                p.id !== second.id
        );

    rest.sort(
        (a, b) =>
            (
                candidateNeedScore(b) -
                baseOVR(b)
            ) -
            (
                candidateNeedScore(a) -
                baseOVR(a)
            )
    );

    return [
        first,
        second,
        rest[0]
    ].filter(Boolean);
}


/* =========================================================
   Screen switching
   ========================================================= */

function showScreen(screenName) {

    const screens = [
        "startScreen",
        "draftScreen",
        "finalScreen"
    ];

    screens.forEach(name => {

        const element = $(name);

        if (!element) return;

        if (name === screenName) {
            element.classList.remove("hidden");
            element.style.display = "";
        } else {
            element.classList.add("hidden");
            element.style.display = "none";
        }
    });
}


/* =========================================================
   Start game
   ========================================================= */

function startGame() {

    const formationElement =
        $("formationSelect");

    formation =
        formationElement?.value ||
        "4-3-3";

    drafted = [];

    usedPlayerIds.clear();

    usedConditionKeys.clear();

    skips = 3;

    draftCount = 0;

    showScreen("draftScreen");

    updateDraftUI();

    nextDraft();
}


/* =========================================================
   Draft UI
   ========================================================= */

function updateDraftUI() {

    const countElement =
        $("draftCount");

    if (countElement) {
        countElement.textContent =
            `${draftCount}/11`;
    }

    const skipElement =
        $("skipCount");

    if (skipElement) {
        skipElement.textContent =
            skips;
    }

    const formationElement =
        $("currentFormation");

    if (formationElement) {
        formationElement.textContent =
            formation;
    }

    updateNeededPosition();

    renderDrafted();

    updateStrategyMessage();
}


/* =========================================================
   Strategy message
   ========================================================= */

function updateStrategyMessage() {

    const element =
        $("strategyMessage");

    if (!element) return;

    const needed =
        neededPositions()[0];

    const chemistry =
        chemistryScore(drafted);

    const combo =
        comboScore(drafted);

    let message = "";

    if (needed) {

        message =
            `🧠 今ほしいポジション：${needed}`;

    } else {

        message =
            "🧠 ポジションはかなり充実！";
    }

    message +=
        `　｜　🤝 ケミストリー ${chemistry}`;

    if (combo.progress.length) {

        message +=
            `　｜　🔥 コンボ狙いあり`;
    }

    element.textContent = message;
}


/* =========================================================
   Next draft
   ========================================================= */

function nextDraft() {

    if (drafted.length >= 11) {

        finishGame();

        return;
    }

    currentCondition =
        pickCondition();

    if (!currentCondition) {

        finishGame();

        return;
    }

    const conditionElement =
        $("condition");

    if (conditionElement) {

        conditionElement.textContent =
            conditionLabel(
                currentCondition
            );
    }

    const candidates =
        getCandidates(
            currentCondition
        );

    renderCandidates(candidates);

    updateDraftUI();
}


/* =========================================================
   Candidate rendering
   ========================================================= */

function renderCandidates(candidates) {

    const box =
        $("candidates");

    if (!box) {
        console.error(
            "candidate-list が見つかりません"
        );
        return;
    }

    box.innerHTML =
        candidates.map(
            (p, i) => {

                const best =
                    bestPosition(p);

                const needed =
                    neededPositions()[0];

                const fit =
                    needed
                        ? Math.round(
                            positionCompatibility(
                                p,
                                needed
                            ) * 100
                        )
                        : 100;

                const chemistry =
                    previewChemistry(p);

                return `
                <button
                    class="candidate-card"
                    data-index="${i}"
                    type="button"
                >

                    <div class="candidate-top">

                        <span class="candidate-number">
                            ${i + 1}
                        </span>

                        <strong>
                            ${esc(p.name)}
                        </strong>

                        <span class="ovr">
                            ${finalOVR(p, best)}
                        </span>

                    </div>

                    <div class="candidate-role">
                        ${getCandidateRole(p, i)}
                    </div>

                    <div>
                        ${esc(p.nationality)}
                        /
                        ${esc(p.team)}
                        ${p.year}
                    </div>

                    <div class="candidate-meta">

                        <span>
                            本来:
                            ${esc(
                                p.naturalPosition ||
                                p.position ||
                                best
                            )}
                        </span>

                        <span>
                            最適:
                            ${best}
                        </span>

                        ${
                            needed
                                ? `
                                <span>
                                    必要${needed}:
                                    ${fit}%
                                </span>
                                `
                                : ""
                        }

                    </div>

                    <div class="stats">

                        <span>PAC ${p.pac}</span>
                        <span>SHO ${p.sho}</span>
                        <span>PAS ${p.pas}</span>
                        <span>DRI ${p.dri}</span>
                        <span>DEF ${p.def}</span>
                        <span>PHY ${p.phy}</span>

                    </div>

                    <div class="bonus">
                        タイトル +${p.titleBonus}
                        /
                        個人賞 +${p.awardBonus}
                    </div>

                    <div class="chem-preview">

                        ${
                            chemistry.nation
                                ? `🤝 同国 +${chemistry.nation}`
                                : ""
                        }

                        ${
                            chemistry.club
                                ? `🏟️ 同クラブ +${chemistry.club}`
                                : ""
                        }

                        ${
                            chemistry.context
                                ? `🔥 同年同クラブ +${chemistry.context}`
                                : ""
                        }

                        ${
                            !chemistry.nation &&
                            !chemistry.club &&
                            !chemistry.context
                                ? "🔗 新しいケミストリー候補"
                                : ""
                        }

                    </div>

                </button>
                `;
            }
        ).join("");

    box
        .querySelectorAll(".candidate-card")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset.index
                        );

                    chooseCandidate(
                        candidates[index]
                    );
                }
            );
        });
}


/* =========================================================
   Choose candidate
   ========================================================= */

function chooseCandidate(p) {

    if (!p) return;

    const same =
        drafted.find(
            x => x.id === p.id
        );

    if (same) {

        const exchange =
            confirm(
                `${p.name}はすでに獲得済み！\n\n` +
                `このカードに入れ替える？`
            );

        if (!exchange) {
            return;
        }

        const index =
            drafted.findIndex(
                x => x.id === p.id
            );

        drafted[index] = p;

    } else {

        drafted.push(p);

        usedPlayerIds.add(p.id);
    }

    draftCount =
        drafted.length;

    updateDraftUI();

    if (drafted.length >= 11) {

        finishGame();

    } else {

        nextDraft();
    }
}


/* =========================================================
   Skip
   ========================================================= */

function skipDraft() {

    if (skips <= 0) {

        alert(
            "スキップはもう使い切った！"
        );

        return;
    }

    skips--;

    updateDraftUI();

    nextDraft();
}


/* =========================================================
   Drafted players
   ========================================================= */

function renderDrafted() {

    const box =
        $("draftedList");

    if (!box) return;

    box.innerHTML =
        drafted.map(
            (p, i) => {

                const best =
                    bestPosition(p);

                return `
                <div class="drafted-player">

                    <span>
                        ${i + 1}
                    </span>

                    <strong>
                        ${esc(p.name)}
                    </strong>

                    <span>
                        ${esc(p.nationality)}
                    </span>

                    <span>
                        ${best}
                    </span>

                    <b>
                        ${finalOVR(p, best)}
                    </b>

                </div>
                `;
            }
        ).join("");
}


/* =========================================================
   Lineup
   ========================================================= */

function slotList() {

    const slots = [];

    (
        formations[formation] ||
        formations["4-3-3"]
    ).forEach(
        ([position, count]) => {

            for (
                let i = 0;
                i < count;
                i++
            ) {
                slots.push(position);
            }
        }
    );

    return slots;
}


/* =========================================================
   Optimal lineup
   ========================================================= */

function bestLineup(team) {

    const slots =
        slotList();

    const n =
        team.length;

    const memo =
        new Map();

    function dp(i, mask) {

        if (i === slots.length) {

            return {
                score: 0,
                assign: []
            };
        }

        const key =
            i + "|" + mask;

        if (memo.has(key)) {
            return memo.get(key);
        }

        let best = {
            score: -Infinity,
            assign: []
        };

        for (
            let j = 0;
            j < n;
            j++
        ) {

            if (
                mask & (1 << j)
            ) {
                continue;
            }

            const player =
                team[j];

            const position =
                slots[i];

            const value =
                finalOVR(
                    player,
                    position
                ) *
                positionCompatibility(
                    player,
                    position
                );

            const next =
                dp(
                    i + 1,
                    mask | (1 << j)
                );

            if (
                value + next.score >
                best.score
            ) {

                best = {
                    score:
                        value +
                        next.score,

                    assign: [
                        {
                            player,
                            pos: position
                        },
                        ...next.assign
                    ]
                };
            }
        }

        memo.set(key, best);

        return best;
    }

    return dp(0, 0);
}


/* =========================================================
   Team evaluation
   ========================================================= */

function evaluateTeam() {

    const lineup =
        bestLineup(drafted);

    const playerAverage =
        lineup.score / 11;

    const chemistry =
        chemistryScore(drafted);

    const combo =
        comboScore(drafted);

    let fit = 0;

    lineup.assign.forEach(
        item => {

            fit +=
                positionCompatibility(
                    item.player,
                    item.pos
                );
        }
    );

    fit =
        (fit / 11) * 10;

    const total =
        Math.min(
            100,

            Math.round(
                playerAverage

                +

                chemistry * .45

                +

                combo.total * .45

                +

                fit * .5
            )
        );

    return {
        lineup,
        playerAverage,
        chemistry,
        combo,
        fit,
        total
    };
}


/* =========================================================
   Rank
   ========================================================= */

function rankFor(score) {

    if (score >= 95) return "S+";
    if (score >= 90) return "S";
    if (score >= 85) return "A+";
    if (score >= 80) return "A";
    if (score >= 75) return "B+";
    if (score >= 70) return "B";

    return "C";
}


/* =========================================================
   Finish
   ========================================================= */

function finishGame() {

    const result =
        evaluateTeam();

    showScreen("finalScreen");

    const teamScore =
        $("teamScore");

    if (teamScore) {
        teamScore.textContent =
            result.total;
    }

    const teamRank =
        $("teamRank");

    if (teamRank) {
        teamRank.textContent =
            rankFor(result.total);
    }

    const playerScore =
        $("playerScore");

    if (playerScore) {
        playerScore.textContent =
            Math.round(
                result.playerAverage
            );
    }

    const chemistryScoreElement =
        $("chemistryScore");

    if (chemistryScoreElement) {
        chemistryScoreElement.textContent =
            Math.round(
                result.chemistry
            );
    }

    const comboScoreElement =
        $("comboScore");

    if (comboScoreElement) {
        comboScoreElement.textContent =
            Math.round(
                result.combo.total
            );
    }

    const formationScoreElement =
        $("formationScore");

    if (formationScoreElement) {
        formationScoreElement.textContent =
            Math.round(
                result.fit * 10
            );
    }

    renderPitch(
        result.lineup.assign
    );

    renderFinalPlayers(
        result.lineup.assign,
        result.combo.labels,
        result.combo.progress
    );
}


/* =========================================================
   Pitch
   ========================================================= */

function renderPitch(assignments) {

    const box =
        $("pitch");

    if (!box) return;

    box.innerHTML =
        assignments.map(
            item => {

                return `
                <div
                    class="pitch-player ${item.pos.toLowerCase()}"
                    title="${esc(item.player.name)}"
                >

                    <b>
                        ${esc(item.player.name)}
                    </b>

                    <span>
                        ${item.pos}
                        ${finalOVR(
                            item.player,
                            item.pos
                        )}
                    </span>

                </div>
                `;
            }
        ).join("");
}


/* =========================================================
   Final players
   ========================================================= */

function renderFinalPlayers(
    assignments,
    labels,
    progress = []
) {

    const box =
        $("finalPlayers");

    if (!box) return;

    box.innerHTML = `

        ${
            labels.length
                ? `
                    <div class="combo-result">
                        ${labels.map(esc).join(" / ")}
                    </div>
                `
                : ""
        }

        ${
            progress.length
                ? `
                    <div class="combo-progress">
                        狙えたコンボ：
                        ${progress.map(esc).join(" / ")}
                    </div>
                `
                : ""
        }

        ${assignments.map(
            (item, i) => {

                return `
                    <div class="final-player">

                        <span>
                            ${i + 1}
                        </span>

                        <strong>
                            ${esc(
                                item.player.name
                            )}
                        </strong>

                        <span>
                            ${item.pos}
                        </span>

                        <span>
                            ${esc(
                                item.player.nationality
                            )}
                        </span>

                        <b>
                            ${finalOVR(
                                item.player,
                                item.pos
                            )}
                        </b>

                    </div>
                `;
            }
        ).join("")}
    `;
}


/* =========================================================
   Button events
   ========================================================= */

function bindEvents() {

    const startButton =
        $("startBtn");

    if (startButton) {

        startButton.addEventListener(
            "click",
            startGame
        );

        console.log(
            "ドラフト開始ボタン：OK"
        );

    } else {

        console.error(
            "ドラフト開始ボタンが見つかりません"
        );
    }


    const skipButton =
        $("skipBtn");

    if (skipButton) {

        skipButton.addEventListener(
            "click",
            skipDraft
        );
    }


    const restartButton =
        $("restartBtn");

    if (restartButton) {

        restartButton.addEventListener(
            "click",
            () => {

                showScreen(
                    "startScreen"
                );
            }
        );
    }
}


/* =========================================================
   Initialize
   ========================================================= */

(async function init() {

    console.log(
        "Football Draft 起動中..."
    );

    bindEvents();

    await loadPlayers();

    console.log(
        "Football Draft 起動完了！"
    );

})();
