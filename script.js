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

    // 基本情報確認とページ切り替え
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

    // 評価入力ページから基本情報ページに戻る
    document.getElementById("backToBasicInfo").addEventListener("click", () => {
        evaluationPage.classList.add("hidden");
        basicInfoPage.classList.remove("hidden");
    });

    // 評価結果ページから評価入力ページに戻る
    document.getElementById("backToEvaluation").addEventListener("click", () => {
        resultPage.classList.add("hidden");
        evaluationPage.classList.remove("hidden");
    });

    // 評価項目を動的に生成
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

    // CSV出力機能
    function exportToCSV() {
        const csvData = [];

        // 基本情報
        csvData.push(["ブロック名", basicInfo.blockName]);
        csvData.push(["店舗名", basicInfo.storeName]);
        csvData.push(["社員番号", basicInfo.employeeId]);
        csvData.push(["氏名", basicInfo.employeeName]);
        csvData.push(["現在の基本給", basicInfo.currentSalary]);

        // 評価結果
        const totalScore = parseFloat(document.getElementById("totalScore").textContent);
        const rank = document.getElementById("rank").textContent;
        const salaryCap = parseInt(document.getElementById("salaryCap").textContent.replace(/,/g, ""));
        const monthlyCuts = parseInt(document.getElementById("monthlyCutsDisplay").textContent.replace(/,/g, ""));
        const annualCuts = parseInt(document.getElementById("annualCutsDisplay").textContent.replace(/,/g, ""));
        const cutScore = parseFloat(document.getElementById("cutScoreDisplay").textContent);

        csvData.push([]);
        csvData.push(["合計点", totalScore]);
        csvData.push(["評価ランク", rank]);
        csvData.push(["適正基本給", salaryCap]);
        csvData.push(["月間カット人数", monthlyCuts]);
        csvData.push(["年間カット人数", annualCuts]);
        csvData.push(["カット点数", cutScore]);

        // CSV文字列の生成
        const csvContent = csvData.map(row => row.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "evaluation_results.csv";
        link.click();
    }

    document.getElementById("restartBtn").addEventListener("click", () => {
        resultPage.classList.add("hidden");
        basicInfoPage.classList.remove("hidden");

        document.getElementById("basicInfoForm").reset();
        document.getElementById("evaluationForm").reset();
        evaluationTable.innerHTML = "";
    });

    document.getElementById("calculateBtn").addEventListener("click", calculateResults);
    document.getElementById("exportBtn").addEventListener("click", exportToCSV);
});
