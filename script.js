document.addEventListener("DOMContentLoaded", () => {
    const basicInfoPage = document.getElementById("basicInfoPage");
    const evaluationPage = document.getElementById("evaluationPage");
    const resultPage = document.getElementById("resultPage");
    const evaluationTable = document.getElementById("evaluationTable");

    const basicInfo = {};
    let evaluationData = [];

    // JSONデータをロード
    fetch("evaluationRank.json")
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
            console.error("評価ランクデータの読み込みに失敗しました:", error);
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

    // 評価項目の動的生成
    async function initializeEvaluationItems() {
        try {
            const response = await fetch("evaluationItems.json");
            const evaluationItems = await response.json();

            evaluationTable.innerHTML = ""; // 再生成時のクリア
            evaluationItems.forEach(({ no, item, description, max }) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${no}</td>
                    <td>${item}</td>
                    <td>${description}</td>
                    <td><input type="number" min="0" max="${max}" value="0" class="scoreInput"></td>
                `;
                evaluationTable.appendChild(row);
            });
        } catch (error) {
            console.error("評価項目データの読み込みに失敗しました:", error);
        }
    }

    // 条件式による点数計算
    function calculateMonthlyCutScore(cutCount) {
        const annualCutCount = cutCount * 12;
        if (annualCutCount < 6000) {
            return { annualCutCount, score: 5 };
        } else if (annualCutCount >= 6000 && annualCutCount < 9500) {
            return { annualCutCount, score: parseFloat((0.01 * annualCutCount - 45).toFixed(1)) };
        } else {
            return { annualCutCount, score: 50 };
        }
    }

    // 評価結果の計算と表示
    function calculateResults() {
        const inputs = document.querySelectorAll(".scoreInput");
        let totalScore = 0;

        inputs.forEach(input => {
            const value = parseInt(input.value) || 0;
            totalScore += value;
        });

        const monthlyCuts = parseInt(document.getElementById("monthlyCuts").value) || 0;
        const { annualCutCount, score: cutScore } = calculateMonthlyCutScore(monthlyCuts);
        totalScore += cutScore;

        const rankData = evaluationData.find(data =>
            (data.max_score === null && totalScore >= data.min_score) ||
            (totalScore >= data.min_score && totalScore <= data.max_score)
        );

        evaluationPage.classList.add("hidden");
        resultPage.classList.remove("hidden");

        document.getElementById("blockNameDisplay").textContent = basicInfo.blockName;
        document.getElementById("storeNameDisplay").textContent = basicInfo.storeName;
        document.getElementById("employeeIdDisplay").textContent = basicInfo.employeeId;
        document.getElementById("employeeNameDisplay").textContent = basicInfo.employeeName;
        document.getElementById("currentSalaryDisplay").textContent = basicInfo.currentSalary.toLocaleString();

        document.getElementById("totalScore").textContent = totalScore.toFixed(1);
        document.getElementById("rank").textContent = rankData ? rankData.rank : "N/A";
        document.getElementById("salaryCap").textContent = rankData ? rankData.salary_cap.toLocaleString() : "N/A";
        document.getElementById("monthlyCutsDisplay").textContent = monthlyCuts.toLocaleString();
        document.getElementById("annualCutsDisplay").textContent = annualCutCount.toLocaleString();
        document.getElementById("cutScoreDisplay").textContent = cutScore.toFixed(1);
    }

    // Excel形式で出力
    function exportToExcel() {
        const workbook = XLSX.utils.book_new();
        const basicInfoData = [];
        const evaluationDataArray = [];

        // 基本情報
        basicInfoData.push(["ブロック名", basicInfo.blockName]);
        basicInfoData.push(["店舗名", basicInfo.storeName]);
        basicInfoData.push(["社員番号", basicInfo.employeeId]);
        basicInfoData.push(["氏名", basicInfo.employeeName]);
        basicInfoData.push(["現在の基本給", basicInfo.currentSalary]);

        // 評価結果
        basicInfoData.push([]);
        basicInfoData.push(["合計点", document.getElementById("totalScore").textContent]);
        basicInfoData.push(["評価ランク", document.getElementById("rank").textContent]);
        basicInfoData.push(["適正基本給", document.getElementById("salaryCap").textContent]);
        basicInfoData.push(["月間カット人数", document.getElementById("monthlyCutsDisplay").textContent]);
        basicInfoData.push(["年間カット人数", document.getElementById("annualCutsDisplay").textContent]);
        basicInfoData.push(["カット点数", document.getElementById("cutScoreDisplay").textContent]);

        // 評価項目と結果
        const rows = document.querySelectorAll("#evaluationTable tr");
        evaluationDataArray.push(["No", "評価項目", "評価内容", "評価点"]);
        rows.forEach(row => {
            const cells = row.children;
            const no = cells[0].textContent;
            const item = cells[1].textContent;
            const description = cells[2].textContent;
            const score = cells[3].querySelector("input").value || 0;
            evaluationDataArray.push([no, item, description, score]);
        });

        // シート作成
        const basicInfoSheet = XLSX.utils.aoa_to_sheet(basicInfoData);
        const evaluationSheet = XLSX.utils.aoa_to_sheet(evaluationDataArray);

        // セル幅の調整
        basicInfoSheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
        evaluationSheet['!cols'] = [{ wch: 5 }, { wch: 41 }, { wch: 57 }, { wch: 10 }];

        XLSX.utils.book_append_sheet(workbook, basicInfoSheet, "基本情報と結果");
        XLSX.utils.book_append_sheet(workbook, evaluationSheet, "評価内容");

        XLSX.writeFile(workbook, "evaluation_results.xlsx");
    }

    document.getElementById("restartBtn").addEventListener("click", () => {
        resultPage.classList.add("hidden");
        basicInfoPage.classList.remove("hidden");

        document.getElementById("basicInfoForm").reset();
        document.getElementById("evaluationForm").reset();
        evaluationTable.innerHTML = "";
    });

    document.getElementById("calculateBtn").addEventListener("click", calculateResults);
    document.getElementById("exportBtn").addEventListener("click", exportToExcel);
});
