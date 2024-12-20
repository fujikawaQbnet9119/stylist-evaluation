document.addEventListener("DOMContentLoaded", () => {
    const basicInfoPage = document.getElementById("basicInfoPage");
    const evaluationPage = document.getElementById("evaluationPage");
    const resultPage = document.getElementById("resultPage");
    const evaluationTable = document.getElementById("evaluationTable");

    const basicInfo = {};
    let evaluationData = [];
    let rankData = [];

    // JSONデータをロード (評価項目)
    fetch("evaluationItems.json")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTPエラー: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            evaluationData = data;
        })
        .catch((error) => {
            console.error("評価項目データの読み込みに失敗しました:", error);
        });

    // JSONデータをロード (ランク表)
    fetch("evaluationRank.json")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTPエラー: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            rankData = data;
        })
        .catch((error) => {
            console.error("ランクデータの読み込みに失敗しました:", error);
        });

    // ページ切り替え (基本情報 → 評価入力)
    document.getElementById("proceedToEvaluation").addEventListener("click", () => {
        basicInfo.blockName = document.getElementById("blockName").value.trim();
        basicInfo.storeName = document.getElementById("storeName").value.trim();
        basicInfo.employeeId = document.getElementById("employeeId").value.trim();
        basicInfo.employeeName = document.getElementById("employeeName").value.trim();
        basicInfo.currentSalary = parseFloat(document.getElementById("currentSalary").value) || 0;

        if (!basicInfo.blockName || !basicInfo.storeName || !basicInfo.employeeId || !basicInfo.employeeName || !basicInfo.currentSalary) {
            alert("すべての項目を正しく入力してください！");
            return;
        }

        basicInfoPage.classList.add("hidden");
        evaluationPage.classList.remove("hidden");
        initializeEvaluationItems();
    });

    // ページ切り替え (評価入力 → 基本情報)
    document.getElementById("backToBasicInfo").addEventListener("click", () => {
        evaluationPage.classList.add("hidden");
        basicInfoPage.classList.remove("hidden");
    });

    // ページ切り替え (評価結果 → 評価入力)
    document.getElementById("backToEvaluation").addEventListener("click", () => {
        resultPage.classList.add("hidden");
        evaluationPage.classList.remove("hidden");
    });

    // 評価項目を動的に生成
    function initializeEvaluationItems() {
        evaluationTable.innerHTML = ""; // 再生成時のクリア
        evaluationData.forEach(({ no, category, item, description, points }) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${no}</td>
                <td>${category}</td>
                <td>${item}</td>
                <td class="evaluation-content">${description}</td>
                <td>
                    <input type="number" class="scoreInput" data-points="${points.join(",")}" />
                </td>
            `;
            evaluationTable.appendChild(row);

            // 入力制御イベントを追加
            const inputField = row.querySelector("input");
            inputField.addEventListener("input", () => {
                const validPoints = inputField.dataset.points.split(",").map(Number);
                const inputValue = parseInt(inputField.value, 10);

                if (!validPoints.includes(inputValue)) {
                    alert(`入力可能な値は次のいずれかです: ${validPoints.join(", ")}`);
                    inputField.value = "";
                }
            });
        });
    }

    // 評価内容の表示/非表示ボタンの実装
    const toggleButton = document.getElementById("toggleEvaluationContent");
    toggleButton.addEventListener("click", () => {
        const contentCells = document.querySelectorAll(".evaluation-content");
        const isVisible = contentCells[0]?.style.display !== "none";

        contentCells.forEach(cell => {
            cell.style.display = isVisible ? "none" : "table-cell";
        });

        toggleButton.textContent = isVisible ? "評価内容を表示" : "評価内容を非表示";
    });

    // 評価結果の計算と表示
    document.getElementById("calculateBtn").addEventListener("click", () => {
        let totalScore = 0;
        const inputs = document.querySelectorAll(".scoreInput");

        inputs.forEach(input => {
            const value = parseFloat(input.value) || 0;
            totalScore += value;
        });

        const monthlyCuts = parseInt(document.getElementById("monthlyCuts").value) || 0;
        const annualCuts = monthlyCuts * 12;
        const cutScore = calculateCutScore(annualCuts);
        totalScore += cutScore;

        displayResults(totalScore, annualCuts, cutScore);
    });

    function calculateCutScore(annualCuts) {
        if (annualCuts < 6000) {
            return 5;
        } else if (annualCuts < 9500) {
            return (0.01 * annualCuts - 45).toFixed(1);
        } else {
            return 50;
        }
    }

    function displayResults(totalScore, annualCuts, cutScore) {
        document.getElementById("blockNameDisplay").textContent = basicInfo.blockName;
        document.getElementById("storeNameDisplay").textContent = basicInfo.storeName;
        document.getElementById("employeeIdDisplay").textContent = basicInfo.employeeId;
        document.getElementById("employeeNameDisplay").textContent = basicInfo.employeeName;
        document.getElementById("currentSalaryDisplay").textContent = basicInfo.currentSalary.toLocaleString();

        document.getElementById("totalScore").textContent = totalScore.toFixed(1);
        document.getElementById("annualCutsDisplay").textContent = annualCuts.toLocaleString();
        document.getElementById("cutScoreDisplay").textContent = cutScore;

        // ランク判定
        const rank = rankData.find(rank => totalScore >= rank.min_score && (rank.max_score === null || totalScore <= rank.max_score));
        if (rank) {
            document.getElementById("rank").textContent = rank.rank;
            document.getElementById("salaryCap").textContent = rank.salary_cap.toLocaleString();
        } else {
            document.getElementById("rank").textContent = "ランク外";
            document.getElementById("salaryCap").textContent = "N/A";
        }

        evaluationPage.classList.add("hidden");
        resultPage.classList.remove("hidden");
    }

    document.getElementById("restartBtn").addEventListener("click", () => {
        resultPage.classList.add("hidden");
        basicInfoPage.classList.remove("hidden");
        document.getElementById("basicInfoForm").reset();
        document.getElementById("evaluationForm").reset();
        evaluationTable.innerHTML = "";
    });

    // Excel形式で出力
    document.getElementById("exportBtn").addEventListener("click", () => {
        const workbook = XLSX.utils.book_new();

        // 基本情報シート
        const basicInfoData = [
            ["ブロック名", basicInfo.blockName],
            ["店舗名", basicInfo.storeName],
            ["社員番号", basicInfo.employeeId],
            ["氏名", basicInfo.employeeName],
            ["現在の基本給", basicInfo.currentSalary.toLocaleString()],
        ];
        const basicInfoSheet = XLSX.utils.aoa_to_sheet(basicInfoData);

        // 列幅を設定
        basicInfoSheet['!cols'] = [
            { wch: 15 }, // ブロック名
            { wch: 30 }  // 内容列の幅
        ];

        // 評価内容シート
        const evaluationDataArray = [["No", "カテゴリ", "評価項目", "内容", "点数"]];
        const rows = document.querySelectorAll("#evaluationTable tr");
        rows.forEach(row => {
            const cells = row.querySelectorAll("td");
            const no = cells[0]?.textContent || "";
            const category = cells[1]?.textContent || "";
            const item = cells[2]?.textContent || "";
            const description = cells[3]?.textContent || "";
            const score = cells[4]?.querySelector("input")?.value || "";
            evaluationDataArray.push([no, category, item, description, score]);
        });
        const evaluationSheet = XLSX.utils.aoa_to_sheet(evaluationDataArray);

        // 列幅を設定
        evaluationSheet['!cols'] = [
            { wch: 3 },  // No
            { wch: 25 }, // カテゴリ
            { wch: 42 }, // 評価項目
            { wch: 107 }, // 内容
            { wch: 10 }  // 点数
        ];

        // 結果シート
        const resultData = [
            ["合計点", document.getElementById("totalScore").textContent],
            ["年間カット人数", document.getElementById("annualCutsDisplay").textContent],
            ["カット点数", document.getElementById("cutScoreDisplay").textContent],
            ["評価ランク", document.getElementById("rank").textContent],
            ["適正基本給", document.getElementById("salaryCap").textContent],
        ];
        const resultSheet = XLSX.utils.aoa_to_sheet(resultData);

        // 列幅を設定
        resultSheet['!cols'] = [
            { wch: 15 }, // ラベル
            { wch: 20 }  // 値
        ];

        // シートをブックに追加
        XLSX.utils.book_append_sheet(workbook, basicInfoSheet, "基本情報");
        XLSX.utils.book_append_sheet(workbook, evaluationSheet, "評価内容");
        XLSX.utils.book_append_sheet(workbook, resultSheet, "評価結果");

        // ファイル名に氏名を含める
        const fileName = `評価結果_${basicInfo.employeeName || "未設定"}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    });


});
