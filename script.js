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
                <td>${description}</td>
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
});
