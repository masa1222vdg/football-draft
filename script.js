// =====================================================
// Football Historical Draft
// =====================================================

// -------------------------
// ゲームデータ
// -------------------------

let players = [];
let draftedPlayers = [];

let selectedFormation = "4-3-3";

let draftCount = 0;
let skipCount = 3;

let currentCondition = null;
let currentCandidates = [];


// =====================================================
// フォーメーション
// =====================================================

const formations = {

    "4-3-3": [
        "GK",
        "LB",
        "CB",
        "CB",
        "RB",
        "CM",
        "CM",
        "CM",
        "LW",
        "ST",
        "RW"
    ],

    "4-4-2": [
        "GK",
        "LB",
        "CB",
        "CB",
        "RB",
        "LM",
        "CM",
        "CM",
        "RM",
        "ST",
        "ST"
    ],

    "3-4-3": [
        "GK",
        "CB",
        "CB",
        "CB",
        "LM",
        "CM",
        "CM",
        "RM",
        "LW",
        "ST",
        "RW"
    ],

    "4-2-3-1": [
        "GK",
        "LB",
        "CB",
        "CB",
        "RB",
        "DM",
        "CM",
        "LW",
        "AM",
        "RW",
        "ST"
    ],

    "3-5-2": [
        "GK",
        "CB",
        "CB",
        "CB",
        "LM",
        "CM",
        "CM",
        "RM",
        "ST",
        "ST"
    ]
};


// =====================================================
// ページ読み込み
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    document
        .getElementById("start-button")
        .addEventListener("click", startGame);

    document
        .getElementById("skip-button")
        .addEventListener("click", skipCondition);

    document
        .getElementById("restart-button")
        .addEventListener("click", restartGame);

});


// =====================================================
// CSV読み込み
// =====================================================

async function loadPlayers() {

    try {

        const response = await fetch("players.csv");

        if (!response.ok) {
            throw new Error("players.csvを読み込めませんでした");
        }

        const text = await response.text();

        players = parseCSV(text);

        console.log("読み込んだ選手数:", players.length);

        if (players.length === 0) {
            alert("players.csvに選手データがありません。");
            return false;
        }

        return true;

    } catch (error) {

        console.error(error);

        alert(
            "players.csvを読み込めませんでした。\n\n" +
            "Eclipseから直接HTMLを開いている場合は、" +
            "後でGitHub PagesなどのWebサーバー上で開く必要があります。"
        );

        return false;
    }
}


// =====================================================
// CSV解析
// =====================================================

function parseCSV(text) {

    text = text.replace(/^\uFEFF/, "");

    const lines = text
        .split(/\r?\n/)
        .filter(line => line.trim() !== "");

    if (lines.length < 2) {
        return [];
    }

    const headers = lines[0]
        .split(",")
        .map(h => h.trim());

    const result = [];

    for (let i = 1; i < lines.length; i++) {

        const values = lines[i].split(",");

        const player = {};

        headers.forEach((header, index) => {
            player[header] = values[index]
                ? values[index].trim()
                : "";
        });

        // 数値に変換
        const numberFields = [
            "year",
            "pac",
            "sho",
            "pas",
            "dri",
            "def",
            "phy",
            "titleBonus",
            "awardBonus"
        ];

        numberFields.forEach(field => {

            player[field] = Number(player[field]) || 0;

        });

        result.push(player);
    }

    return result;
}


// =====================================================
// ゲーム開始
// =====================================================

async function startGame() {

    const loaded = await loadPlayers();

    if (!loaded) {
        return;
    }

    selectedFormation =
        document.getElementById("formation-select").value;

    draftedPlayers = [];

    draftCount = 0;
    skipCount = 3;

    document
        .getElementById("start-screen")
        .classList.add("hidden");

    document
        .getElementById("final-screen")
        .classList.add("hidden");

    document
        .getElementById("draft-screen")
        .classList.remove("hidden");

    document
        .getElementById("current-formation")
        .textContent = selectedFormation;

    updateDraftInfo();

    nextDraft();

}


// =====================================================
// 次のドラフト
// =====================================================

function nextDraft() {

    if (draftCount >= 11) {

        finishGame();

        return;
    }

    currentCondition = getRandomCondition();

    currentCandidates =
        getCandidates(currentCondition);

    displayCondition();

    displayCandidates();

    updateNeededPosition();

}


// =====================================================
// 条件をランダム取得
// =====================================================

function getRandomCondition() {

    const conditions = [];

    for (const player of players) {

        const condition = {

            source: player.source,
            year: player.year,
            team: player.team,
            tournament: player.tournament

        };

        const exists = conditions.some(c =>
            c.source === condition.source &&
            c.year === condition.year &&
            c.team === condition.team &&
            c.tournament === condition.tournament
        );

        if (!exists) {
            conditions.push(condition);
        }
    }

    if (conditions.length === 0) {
        return null;
    }

    return conditions[
        Math.floor(Math.random() * conditions.length)
    ];
}


// =====================================================
// 条件に合う選手
// =====================================================

function getCandidates(condition) {

    let candidates = players.filter(player => {

        if (player.source !== condition.source) {
            return false;
        }

        if (Number(player.year) !== Number(condition.year)) {
            return false;
        }

        if (player.team !== condition.team) {
            return false;
        }

        if (player.source === "NATIONAL") {

            if (player.tournament !== condition.tournament) {
                return false;
            }
        }

        return true;

    });

    // 現在のチームにすでに同じカードがある場合も候補としては出す
    candidates = shuffle(candidates);

    return candidates.slice(0, 3);
}


// =====================================================
// 条件表示
// =====================================================

function displayCondition() {

    const element =
        document.getElementById("condition-text");

    if (currentCondition.source === "CLUB") {

        element.textContent =
            `${currentCondition.year} ${currentCondition.team}`;

    } else {

        element.textContent =
            `${currentCondition.year} FIFA ${currentCondition.tournament} - ${currentCondition.team}`;

    }
}


// =====================================================
// 候補表示
// =====================================================

function displayCandidates() {

    const container =
        document.getElementById("candidate-list");

    container.innerHTML = "";

    if (currentCandidates.length === 0) {

        container.innerHTML = `
            <div class="message">
                この条件に該当する選手がいません。
            </div>
        `;

        return;
    }

    currentCandidates.forEach((player, index) => {

        const card =
            document.createElement("div");

        card.className = "player-card";

        const baseOVR =
            getBaseOVR(player);

        card.innerHTML = `

            <div class="player-ovr">
                <span>OVR</span>
                <strong>${baseOVR}</strong>
            </div>

            <h3>${player.name}</h3>

            <div class="player-meta">
                ${player.nationality}<br>
                ${player.year} ${player.team}
            </div>

            <span class="player-position">
                ${player.naturalPosition || player.position || "FW"}
            </span>

            <div class="player-stats">

                <div>
                    <span>PAC</span>
                    <strong>${player.pac}</strong>
                </div>

                <div>
                    <span>SHO</span>
                    <strong>${player.sho}</strong>
                </div>

                <div>
                    <span>PAS</span>
                    <strong>${player.pas}</strong>
                </div>

                <div>
                    <span>DRI</span>
                    <strong>${player.dri}</strong>
                </div>

                <div>
                    <span>DEF</span>
                    <strong>${player.def}</strong>
                </div>

                <div>
                    <span>PHY</span>
                    <strong>${player.phy}</strong>
                </div>

            </div>

            <button class="pick-button">
                この選手を獲得
            </button>
        `;

        card
            .querySelector(".pick-button")
            .addEventListener("click", () => {

                selectPlayer(player);

            });

        container.appendChild(card);

    });
}


// =====================================================
// 選手獲得
// =====================================================

function selectPlayer(player) {

    const samePlayer =
        draftedPlayers.find(p => p.id === player.id);

    // 同一人物がすでにいる
    if (samePlayer) {

        const exchange =
            confirm(
                `${player.name}はすでにチームにいます。\n\n` +
                `現在のカード：${samePlayer.year} ${samePlayer.team}\n` +
                `今回のカード：${player.year} ${player.team}\n\n` +
                `今回のカードに交換しますか？\n\n` +
                `OK → 交換\n` +
                `キャンセル → 今回のカードを拒否`
            );

        if (exchange) {

            const index =
                draftedPlayers.indexOf(samePlayer);

            draftedPlayers[index] = player;

        } else {

            // 今回のカードを拒否
            nextDraft();
            return;
        }

    } else {

        draftedPlayers.push(player);

        draftCount++;

    }

    updateDraftInfo();

    displayDraftedPlayers();

    if (draftCount >= 11) {

        finishGame();

    } else {

        nextDraft();

    }
}


// =====================================================
// スキップ
// =====================================================

function skipCondition() {

    if (skipCount <= 0) {

        alert("スキップはもう使えません！");

        return;
    }

    skipCount--;

    updateDraftInfo();

    nextDraft();

}


// =====================================================
// ドラフト情報更新
// =====================================================

function updateDraftInfo() {

    document
        .getElementById("draft-count")
        .textContent =
        `${draftCount} / 11`;

    document
        .getElementById("skip-count")
        .textContent =
        skipCount;
}


// =====================================================
// 現在のチーム表示
// =====================================================

function displayDraftedPlayers() {

    const container =
        document.getElementById("drafted-list");

    container.innerHTML = "";

    draftedPlayers.forEach(player => {

        const element =
            document.createElement("div");

        element.className = "drafted-player";

        element.textContent =
            `${player.name} (${player.naturalPosition || player.position})`;

        container.appendChild(element);

    });
}


// =====================================================
// 必要ポジション
// =====================================================

function updateNeededPosition() {

    const positions =
        formations[selectedFormation];

    const usedPositions = {};

    draftedPlayers.forEach(player => {

        const best =
            getBestPosition(player, positions);

        usedPositions[best.position] =
            (usedPositions[best.position] || 0) + 1;

    });

    let neededPosition = positions[0];

    for (const position of positions) {

        const required =
            positions.filter(p => p === position).length;

        const current =
            usedPositions[position] || 0;

        if (current < required) {

            neededPosition = position;

            break;
        }
    }

    document
        .getElementById("needed-position")
        .textContent =
        neededPosition;
}


// =====================================================
// 基本OVR
// =====================================================

function getBaseOVR(player) {

    const total =
        player.pac +
        player.sho +
        player.pas +
        player.dri +
        player.def +
        player.phy;

    return Math.round(total / 6);
}


// =====================================================
// ポジション適性
// =====================================================

function canPlay(player, position) {

    const natural =
        player.naturalPosition ||
        player.position ||
        "";

    const rules = {

        GK: ["GK"],

        CB: ["CB", "LB", "RB", "DM"],

        LB: ["LB", "CB", "LM"],

        RB: ["RB", "CB", "RM"],

        DM: ["DM", "CM", "CB"],

        CM: ["CM", "DM", "AM"],

        AM: ["AM", "CM", "LW", "RW"],

        LM: ["LM", "LW", "CM", "LB"],

        RM: ["RM", "RW", "CM", "RB"],

        LW: ["LW", "ST", "AM", "LM"],

        RW: ["RW", "ST", "AM", "RM"],

        ST: ["ST", "LW", "RW", "AM"]

    };

    if (!rules[position]) {
        return true;
    }

    return rules[position].includes(natural);
}


// =====================================================
// ポジション別能力
// =====================================================

function getPositionOVR(player, position) {

    let value = 0;

    switch (position) {

        case "GK":
            value =
                (player.def +
                 player.phy +
                 player.pas) / 3;
            break;

        case "CB":
            value =
                (player.def +
                 player.phy +
                 player.pas) / 3;
            break;

        case "LB":
        case "RB":
            value =
                (player.pac +
                 player.def +
                 player.pas +
                 player.phy) / 4;
            break;

        case "DM":
            value =
                (player.pas +
                 player.def +
                 player.phy +
                 player.dri) / 4;
            break;

        case "CM":
            value =
                (player.pas +
                 player.dri +
                 player.def +
                 player.sho) / 4;
            break;

        case "AM":
            value =
                (player.pas +
                 player.dri +
                 player.sho +
                 player.pac) / 4;
            break;

        case "LM":
        case "RM":
            value =
                (player.pac +
                 player.pas +
                 player.dri +
                 player.def) / 4;
            break;

        case "LW":
        case "RW":
            value =
                (player.pac +
                 player.sho +
                 player.dri +
                 player.pas) / 4;
            break;

        case "ST":
            value =
                (player.sho +
                 player.dri +
                 player.phy +
                 player.pac) / 4;
            break;

        default:
            value = getBaseOVR(player);
    }

    return value;
}


// =====================================================
// 最終OVR
// =====================================================

function getFinalOVR(player, position) {

    let value =
        getPositionOVR(player, position);

    value += Number(player.titleBonus) || 0;
    value += Number(player.awardBonus) || 0;

    return Math.min(100, Math.round(value));
}


// =====================================================
// 一番得意なポジション
// =====================================================

function getBestPosition(player, positions) {

    let bestPosition = positions[0];
    let bestValue = -Infinity;

    for (const position of positions) {

        if (!canPlay(player, position)) {
            continue;
        }

        const value =
            getFinalOVR(player, position);

        if (value > bestValue) {

            bestValue = value;
            bestPosition = position;

        }
    }

    // どこにも適性がない場合
    if (bestValue === -Infinity) {

        for (const position of positions) {

            const value =
                getFinalOVR(player, position) - 15;

            if (value > bestValue) {

                bestValue = value;
                bestPosition = position;

            }
        }
    }

    return {
        position: bestPosition,
        value: bestValue
    };
}


// =====================================================
// 自動最適配置
// =====================================================

function optimizeLineup() {

    const positions =
        formations[selectedFormation];

    const n = draftedPlayers.length;

    const size = 1 << n;

    const dp =
        new Array(size).fill(-Infinity);

    const parentMask =
        new Array(size).fill(-1);

    const parentPlayer =
        new Array(size).fill(-1);

    dp[0] = 0;

    for (let mask = 0; mask < size; mask++) {

        if (dp[mask] === -Infinity) {
            continue;
        }

        const slotIndex =
            countBits(mask);

        if (slotIndex >= positions.length) {
            continue;
        }

        const position =
            positions[slotIndex];

        for (let i = 0; i < n; i++) {

            if (mask & (1 << i)) {
                continue;
            }

            const player =
                draftedPlayers[i];

            let score =
                getFinalOVR(player, position);

            // 適性がない場合は大きく減点
            if (!canPlay(player, position)) {
                score -= 20;
            } else {

                const natural =
                    player.naturalPosition;

                if (natural === position) {
                    score += 3;
                }
            }

            const newMask =
                mask | (1 << i);

            const newScore =
                dp[mask] + score;

            if (newScore > dp[newMask]) {

                dp[newMask] = newScore;

                parentMask[newMask] = mask;

                parentPlayer[newMask] = i;
            }
        }
    }

    const finalMask =
        size - 1;

    const lineup =
        new Array(positions.length);

    let mask = finalMask;

    for (let slot = positions.length - 1;
         slot >= 0;
         slot--) {

        const playerIndex =
            parentPlayer[mask];

        lineup[slot] = {

            position: positions[slot],

            player: draftedPlayers[playerIndex]

        };

        mask =
            parentMask[mask];
    }

    return lineup;
}


// =====================================================
// ビット数
// =====================================================

function countBits(number) {

    let count = 0;

    while (number) {

        count += number & 1;

        number >>= 1;
    }

    return count;
}


// =====================================================
// チーム評価
// =====================================================

function evaluateTeam(lineup) {

    let playerScore = 0;

    lineup.forEach(slot => {

        playerScore +=
            getFinalOVR(
                slot.player,
                slot.position
            );

    });

    const chemistry =
        calculateChemistry(lineup);

    const combo =
        calculateSpecialCombo(lineup);

    const formation =
        calculateFormationBonus(lineup);

    // 11人の能力平均を100点満点にする
    const abilityAverage =
        playerScore / 11;

    let teamScore =
        abilityAverage;

    // ケミストリー
    teamScore += chemistry * 0.4;

    // 特殊コンボ
    teamScore += combo * 0.35;

    // フォーメーション
    teamScore += formation * 0.5;

    teamScore =
        Math.min(100, Math.round(teamScore));

    return {

        teamScore,
        playerScore,
        chemistry,
        combo,
        formation

    };
}


// =====================================================
// フォーメーションボーナス
// =====================================================

function calculateFormationBonus(lineup) {

    let score = 0;

    lineup.forEach(slot => {

        const player =
            slot.player;

        if (!canPlay(player, slot.position)) {
            return;
        }

        if (player.naturalPosition === slot.position) {

            score += 2;

        } else {

            score += 1;

        }

    });

    return score;
}


// =====================================================
// ケミストリー
// =====================================================

function calculateChemistry(lineup) {

    let score = 0;

    for (let i = 0; i < lineup.length; i++) {

        for (let j = i + 1;
             j < lineup.length;
             j++) {

            const a =
                lineup[i].player;

            const b =
                lineup[j].player;

            // 同じ国
            if (a.nationality === b.nationality) {
                score += 1;
            }

            // 同じクラブ・同じ年
            if (
                a.source === "CLUB" &&
                b.source === "CLUB" &&
                a.year === b.year &&
                normalizeTeam(a.team) === normalizeTeam(b.team)
            ) {
                score += 3;
            }

            // 同じクラブ経験
            if (
                a.source === "CLUB" &&
                b.source === "CLUB" &&
                normalizeTeam(a.team) === normalizeTeam(b.team)
            ) {
                score += 1;
            }

            // 同じ代表チーム
            if (
                a.source === "NATIONAL" &&
                b.source === "NATIONAL" &&
                normalizeTeam(a.team) === normalizeTeam(b.team)
            ) {
                score += 1;
            }
        }
    }

    return Math.min(25, score);
}


// =====================================================
// 特殊コンボ
// =====================================================

function calculateSpecialCombo(lineup) {

    const ids =
        lineup.map(slot => slot.player.id);

    let score = 0;

    // Messi + Xavi + Iniesta
    if (
        ids.includes("messi") &&
        ids.includes("xavi") &&
        ids.includes("iniesta")
    ) {
        score += 15;
    }

    // Xavi + Iniesta + Busquets
    if (
        ids.includes("xavi") &&
        ids.includes("iniesta") &&
        ids.includes("busquets")
    ) {
        score += 12;
    }

    // Messi + Neymar + Suarez
    if (
        ids.includes("messi") &&
        ids.includes("neymar") &&
        ids.includes("suarez")
    ) {
        score += 12;
    }

    // CR7 + Benzema + Bale
    if (
        ids.includes("cr7") &&
        ids.includes("benzema") &&
        ids.includes("bale")
    ) {
        score += 12;
    }

    // CR7 + Benzema
    if (
        ids.includes("cr7") &&
        ids.includes("benzema")
    ) {
        score += 5;
    }

    // Xavi + Iniesta
    if (
        ids.includes("xavi") &&
        ids.includes("iniesta")
    ) {
        score += 8;
    }

    return Math.min(35, score);
}


// =====================================================
// チーム名統一
// =====================================================

function normalizeTeam(team) {

    const name =
        team.toLowerCase().trim();

    if (
        name === "fc barcelona" ||
        name === "barcelona"
    ) {
        return "barcelona";
    }

    if (
        name === "manchester united" ||
        name === "man utd"
    ) {
        return "manchester united";
    }

    if (
        name === "manchester city" ||
        name === "man city"
    ) {
        return "manchester city";
    }

    if (
        name === "inter milan" ||
        name === "inter"
    ) {
        return "inter";
    }

    if (
        name === "ac milan" ||
        name === "milan"
    ) {
        return "ac milan";
    }

    return name;
}


// =====================================================
// 最終ゲーム
// =====================================================

function finishGame() {

    if (draftedPlayers.length < 11) {
        return;
    }

    const lineup =
        optimizeLineup();

    const evaluation =
        evaluateTeam(lineup);

    displayFinalLineup(lineup);

    displayEvaluation(evaluation);

    document
        .getElementById("draft-screen")
        .classList.add("hidden");

    document
        .getElementById("final-screen")
        .classList.remove("hidden");

}


// =====================================================
// 最終ピッチ表示
// =====================================================

function displayFinalLineup(lineup) {

    const pitch =
        document.getElementById("pitch");

    pitch.innerHTML = "";

    lineup.forEach(slot => {

        const position =
            getPitchPosition(
                selectedFormation,
                slot.position,
                lineup
            );

        const element =
            document.createElement("div");

        element.className =
            "pitch-player";

        element.style.left =
            position.x + "%";

        element.style.top =
            position.y + "%";

        const ovr =
            getFinalOVR(
                slot.player,
                slot.position
            );

        element.innerHTML = `

            <div class="pitch-player-card">

                <div class="pitch-position">
                    ${slot.position}
                </div>

                <div class="pitch-ovr">
                    ${ovr}
                </div>

                <div class="pitch-name">
                    ${slot.player.name}
                </div>

            </div>
        `;

        pitch.appendChild(element);

    });


    // 選手一覧

    const list =
        document.getElementById("final-player-list");

    list.innerHTML = "";

    lineup.forEach(slot => {

        const item =
            document.createElement("div");

        item.className =
            "final-player";

        item.innerHTML = `

            <div>
                <strong>
                    ${slot.position}
                </strong>
                ${slot.player.name}
            </div>

            <small>
                OVR ${getFinalOVR(
                    slot.player,
                    slot.position
                )}
            </small>
        `;

        list.appendChild(item);

    });

}


// =====================================================
// ピッチ上の座標
// =====================================================

function getPitchPosition(
    formation,
    position,
    lineup
) {

    // ポジションごとの基本配置
    const layouts = {

        "4-3-3": {

            GK: [50, 93],

            LB: [18, 76],
            CB: [40, 80],
            RB: [82, 76],

            CM: [50, 58],

            LW: [18, 25],
            ST: [50, 17],
            RW: [82, 25]
        },

        "4-4-2": {

            GK: [50, 93],

            LB: [18, 76],
            CB: [40, 80],
            RB: [82, 76],

            LM: [18, 52],
            CM: [40, 55],
            RM: [82, 52],

            ST: [40, 20]
        },

        "3-4-3": {

            GK: [50, 93],

            CB: [25, 78],
            CB2: [50, 80],
            CB3: [75, 78],

            LM: [15, 53],
            CM: [42, 55],
            RM: [85, 53],

            LW: [18, 25],
            ST: [50, 17],
            RW: [82, 25]
        },

        "4-2-3-1": {

            GK: [50, 93],

            LB: [18, 76],
            CB: [40, 80],
            RB: [82, 76],

            DM: [38, 62],
            CM: [62, 62],

            LW: [18, 40],
            AM: [50, 35],
            RW: [82, 40],

            ST: [50, 15]
        },

        "3-5-2": {

            GK: [50, 93],

            CB: [25, 78],
            CB2: [50, 80],
            CB3: [75, 78],

            LM: [12, 53],
            CM: [35, 55],
            CM2: [65, 55],
            RM: [88, 53],

            ST: [40, 18]
        }
    };

    const layout =
        layouts[formation];

    if (!layout) {
        return {
            x: 50,
            y: 50
        };
    }

    // 同じポジションが複数ある場合
    const same =
        lineup.filter(
            slot => slot.position === position
        );

    if (same.length <= 1) {

        const coords =
            layout[position];

        if (coords) {

            return {
                x: coords[0],
                y: coords[1]
            };
        }
    }

    // 同じポジションを横に並べる
    const index =
        same.findIndex(
            slot =>
                slot.player.id ===
                lineup.find(
                    s =>
                        s.position === position &&
                        s.player.id ===
                        slot.player.id
                )?.player.id
        );

    const count =
        same.length;

    let y = 50;

    if (position === "ST") {
        y = 18;
    }

    if (position === "CB") {
        y = 80;
    }

    if (position === "CM") {
        y = 55;
    }

    const x =
        20 +
        ((index + 1) * 60 / (count + 1));

    return {
        x,
        y
    };
}


// =====================================================
// 評価表示
// =====================================================

function displayEvaluation(evaluation) {

    document
        .getElementById("team-score")
        .textContent =
        evaluation.teamScore;

    document
        .getElementById("team-rank")
        .textContent =
        getRank(evaluation.teamScore);

    document
        .getElementById("player-score")
        .textContent =
        Math.round(
            evaluation.playerScore
        );

    document
        .getElementById("chemistry-score")
        .textContent =
        evaluation.chemistry;

    document
        .getElementById("combo-score")
        .textContent =
        evaluation.combo;

    document
        .getElementById("formation-score")
        .textContent =
        evaluation.formation;

}


// =====================================================
// ランク
// =====================================================

function getRank(score) {

    if (score >= 95) {
        return "S+";
    }

    if (score >= 90) {
        return "S";
    }

    if (score >= 85) {
        return "A+";
    }

    if (score >= 80) {
        return "A";
    }

    if (score >= 75) {
        return "B+";
    }

    if (score >= 70) {
        return "B";
    }

    return "C";
}


// =====================================================
// リスタート
// =====================================================

function restartGame() {

    draftedPlayers = [];

    draftCount = 0;

    skipCount = 3;

    document
        .getElementById("final-screen")
        .classList.add("hidden");

    document
        .getElementById("draft-screen")
        .classList.add("hidden");

    document
        .getElementById("start-screen")
        .classList.remove("hidden");

}


// =====================================================
// 配列シャッフル
// =====================================================

function shuffle(array) {

    const copy =
        [...array];

    for (
        let i = copy.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            copy[i],
            copy[j]
        ] = [
            copy[j],
            copy[i]
        ];
    }

    return copy;
}