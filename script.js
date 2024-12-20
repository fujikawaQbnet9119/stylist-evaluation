document.addEventListener("DOMContentLoaded", () => {
    const basicInfoPage = document.getElementById("basicInfoPage");
    const evaluationPage = document.getElementById("evaluationPage");
    const resultPage = document.getElementById("resultPage");
    const evaluationTable = document.getElementById("evaluationTable");

    const toggleButton = document.getElementById("toggleEvaluationContent");
    const categoryFilter = document.getElementById("categoryFilter");

    const basicInfo = {};
    let evaluationData = [];
    let rankData = [];

    // JSONデータをロード (評価項目)
    const loadJSON = async (url, callback) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTPエラー: ${response.status}`);
            const data = await response.json();
            callback(data);
        } catch (error) {
            console.error(`${url}の読み込みに失敗しました:`, error);
        }
    };

    const initialize = () => {
        loadJSON("evaluationItems.json", data => {
            evaluationData = data;
            initializeCategoryFilter();
            initializeEvaluationItems();
        });
        loadJSON("evaluationRank.json", data => {
            rankData = data;
        });
    };

    const switchPage = (hidePage, showPage) => {
        if (!hidePage || !showPage) {
            console.error("ページ切り替えエラー: 要素が見つかりません。", { hidePage, showPage });
            return;
        }
        hidePage.classList.add("hidden");
        showPage.classList.remove("hidden");
    };

    const initializeEvaluationItems = () => {
        evaluationTable.innerHTML = "";
        evaluationData.forEach(({ no, category, item, description, points }) => {
            const row = document.createElement("tr");
            const maxPoint = Math.max(...points);
            const minPoint = Math.min(...points);

            row.innerHTML = `
                <td>${no}</td>
                <td>${category}</td>
                <td>${item}</td>
                <td class="evaluation-content">${description}</td>
                <td style="text-align: center;">
                    <input type="range"
                        class="scoreSlider"
                        min="${minPoint}"
                        max="${maxPoint}"
                        value="${maxPoint}"
                        step="1"
                        oninput="this.nextElementSibling.textContent = this.value" />
                    <span class="sliderValue">${maxPoint}</span>
                </td>
            `;
            evaluationTable.appendChild(row);
        });
    };

    const initializeCategoryFilter = () => {
        categoryFilter.innerHTML = '<option value="all">すべて</option>';
        const categories = [...new Set(evaluationData.map(item => item.category))];
        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    };

    categoryFilter?.addEventListener("change", e => {
        const category = e.target.value;
        document.querySelectorAll("#evaluationTable tr").forEach(row => {
            const rowCategory = row.querySelector("td:nth-child(2)").textContent;
            row.style.display = category === "all" || rowCategory === category ? "" : "none";
        });
    });

    toggleButton?.addEventListener("click", () => {
        const contentCells = document.querySelectorAll(".evaluation-content");
        const isVisible = contentCells[0]?.style.display !== "none";

        contentCells.forEach(cell => {
            cell.style.display = isVisible ? "none" : "table-cell";
        });

        toggleButton.textContent = isVisible ? "評価内容表示" : "評価内容非表示";
    });

    const calculateResults = () => {
        let totalScore = 0;

        document.querySelectorAll(".scoreSlider").forEach(input => {
            const value = parseFloat(input.value);
            if (!isNaN(value)) {
                totalScore += value;
            }
        });

        const monthlyCuts = parseInt(document.getElementById("monthlyCuts").value, 10) || 0;
        const annualCuts = monthlyCuts * 12;
        const cutScore = calculateCutScore(annualCuts);

        totalScore += cutScore;

        displayResults(totalScore, annualCuts, cutScore);
    };

    const calculateCutScore = annualCuts => {
        if (annualCuts < 6000) {
            return 5;
        }
        if (annualCuts < 9500) {
            return Math.max(0, (0.01 * annualCuts - 45).toFixed(1));
        }
        return 50;
    };

    const displayResults = (totalScore, annualCuts, cutScore) => {
        document.getElementById("blockNameDisplay").textContent = basicInfo.blockName;
        document.getElementById("storeNameDisplay").textContent = basicInfo.storeName;
        document.getElementById("employeeIdDisplay").textContent = basicInfo.employeeId;
        document.getElementById("employeeNameDisplay").textContent = basicInfo.employeeName;
        document.getElementById("currentSalaryDisplay").textContent = basicInfo.currentSalary.toLocaleString();

        document.getElementById("totalScore").textContent = totalScore.toFixed(1);
        document.getElementById("annualCutsDisplay").textContent = annualCuts.toLocaleString();
        document.getElementById("cutScoreDisplay").textContent = cutScore.toFixed(1);

        const rank = rankData.find(rank => totalScore >= rank.min_score &&
            (rank.max_score === null || totalScore <= rank.max_score));

        document.getElementById("rank").textContent = rank ? rank.rank : "ランク外";
        document.getElementById("salaryCap").textContent = rank ? rank.salary_cap.toLocaleString() : "N/A";

        switchPage(evaluationPage, resultPage);
    };

    document.getElementById("calculateBtn")?.addEventListener("click", calculateResults);

    document.getElementById("proceedToEvaluation")?.addEventListener("click", () => {
        basicInfo.blockName = document.getElementById("blockName").value.trim();
        basicInfo.storeName = document.getElementById("storeName").value.trim();
        basicInfo.employeeId = document.getElementById("employeeId").value.trim();
        basicInfo.employeeName = document.getElementById("employeeName").value.trim();
        basicInfo.currentSalary = parseFloat(document.getElementById("currentSalary").value) || 0;

        if (!basicInfo.blockName || !basicInfo.storeName || !basicInfo.employeeId || !basicInfo.employeeName || !basicInfo.currentSalary) {
            alert("すべての項目を正しく入力してください！");
            return;
        }

        switchPage(basicInfoPage, evaluationPage);
    });

    document.getElementById("backToBasicInfo")?.addEventListener("click", () => {
        switchPage(evaluationPage, basicInfoPage);
    });

    document.getElementById("backToEvaluation")?.addEventListener("click", () => {
        switchPage(resultPage, evaluationPage);
    });

    document.getElementById("restartBtn")?.addEventListener("click", () => {
        switchPage(resultPage, basicInfoPage);
        document.getElementById("basicInfoForm").reset();
        document.getElementById("evaluationForm").reset();
        evaluationTable.innerHTML = "";
    });

    document.getElementById("exportBtn")?.addEventListener("click", () => {
        const workbook = XLSX.utils.book_new();

        const basicInfoSheet = XLSX.utils.aoa_to_sheet([
            ["ブロック名", basicInfo.blockName],
            ["店舗名", basicInfo.storeName],
            ["社員番号", basicInfo.employeeId],
            ["氏名", basicInfo.employeeName],
            ["現基本給", basicInfo.currentSalary.toLocaleString()],
        ]);
        basicInfoSheet['!cols'] = [{ wch: 15 }, { wch: 30 }];

        const evaluationDataArray = [["No", "カテゴリ", "評価項目", "内容", "点数"]];
        document.querySelectorAll("#evaluationTable tr").forEach(row => {
            const cells = row.querySelectorAll("td");
            evaluationDataArray.push([
                cells[0]?.textContent || "",
                cells[1]?.textContent || "",
                cells[2]?.textContent || "",
                cells[3]?.textContent || "",
                cells[4]?.querySelector("input")?.value || ""
            ]);
        });

        const evaluationSheet = XLSX.utils.aoa_to_sheet(evaluationDataArray);
        evaluationSheet['!cols'] = [
            { wch: 3 },
            { wch: 25 },
            { wch: 42 },
            { wch: 107 },
            { wch: 10 }
        ];

        const resultSheet = XLSX.utils.aoa_to_sheet([
            ["合計点", document.getElementById("totalScore").textContent],
            ["年間カット人数換算", document.getElementById("annualCutsDisplay").textContent],
            ["カット点数", document.getElementById("cutScoreDisplay").textContent],
            ["評価ランク", document.getElementById("rank").textContent],
            ["適正基本給", document.getElementById("salaryCap").textContent],
        ]);
        resultSheet['!cols'] = [{ wch: 15 }, { wch: 20 }];

        XLSX.utils.book_append_sheet(workbook, basicInfoSheet, "基本情報");
        XLSX.utils.book_append_sheet(workbook, evaluationSheet, "評価内容");
        XLSX.utils.book_append_sheet(workbook, resultSheet, "評価結果");

        XLSX.writeFile(workbook, `評価結果_${basicInfo.employeeName || "未設定"}.xlsx`);
    });

    initialize();
});
