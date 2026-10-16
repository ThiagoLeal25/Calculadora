(() => {
  const expressionEl = document.querySelector("#expression");
  const resultEl = document.querySelector("#result");
  const historyEl = document.querySelector("#history-list");
  const modeLabel = document.querySelector("#mode-label");
  const keypad = document.querySelector("#keypad");
  const history = [];
  let current = "0";
  let stored = null;
  let operator = null;
  let waitingForOperand = false;
  let justEvaluated = false;

  const pretty = (value) => {
    if (!Number.isFinite(value)) return "Erro";
    const rounded = Math.abs(value) < 1e-10 ? 0 : Number(value.toPrecision(11));
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 10 }).format(rounded);
  };
  const numeric = () => Number(current.replace(",", "."));
  const show = () => {
    resultEl.textContent = current === "Erro" ? current : pretty(numeric());
    expressionEl.textContent = stored !== null && operator
      ? `${pretty(stored)} ${operator} ${waitingForOperand ? "" : current}`
      : (justEvaluated ? expressionEl.textContent : current);
  };
  const updateResult = (value) => {
    current = Number.isFinite(value) ? String(Number(value.toPrecision(11))) : "Erro";
    resultEl.textContent = current === "Erro" ? "Não é possível" : pretty(Number(current));
  };
  const inputDigit = (digit) => {
    if (current === "Erro" || waitingForOperand || justEvaluated) {
      current = digit;
      waitingForOperand = false;
      justEvaluated = false;
      if (stored === null) expressionEl.textContent = "";
    } else if (current.replace("-", "").replace(".", "").length < 14) {
      current = current === "0" ? digit : current + digit;
    }
    show();
  };
  const inputDecimal = () => {
    if (current === "Erro" || waitingForOperand || justEvaluated) {
      current = "0.";
      waitingForOperand = false;
      justEvaluated = false;
    } else if (!current.includes(".")) current += ".";
    show();
  };
  const clear = () => {
    current = "0"; stored = null; operator = null;
    waitingForOperand = false; justEvaluated = false;
    expressionEl.textContent = "0"; resultEl.textContent = "0"; modeLabel.textContent = "PADRÃO";
  };
  const backspace = () => {
    if (waitingForOperand || justEvaluated || current === "Erro") return clear();
    current = current.length > 1 ? current.slice(0, -1) : "0";
    if (current === "-") current = "0";
    show();
  };
  const calculate = (a, b, op) => {
    switch (op) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? NaN : a / b;
      default: return b;
    }
  };
  const chooseOperator = (nextOperator) => {
    const input = numeric();
    if (current === "Erro") return;
    if (operator && !waitingForOperand) {
      const value = calculate(stored, input, operator);
      if (!Number.isFinite(value)) {
        current = "Erro"; stored = null; operator = null;
        resultEl.textContent = "Não é possível"; expressionEl.textContent = "Divisão inválida"; return;
      }
      stored = value; current = String(Number(value.toPrecision(11)));
      resultEl.textContent = pretty(value);
    } else stored = input;
    operator = nextOperator;
    waitingForOperand = true;
    justEvaluated = false;
    modeLabel.textContent = "OPERAÇÃO";
    expressionEl.textContent = `${pretty(stored)} ${operator}`;
  };
  const equals = () => {
    if (!operator || stored === null || waitingForOperand || current === "Erro") return;
    const a = stored, b = numeric(), op = operator;
    const value = calculate(a, b, op);
    const fullExpression = `${pretty(a)} ${op} ${pretty(b)}`;
    expressionEl.textContent = fullExpression + " =";
    if (!Number.isFinite(value)) {
      current = "Erro"; resultEl.textContent = "Não é possível";
    } else {
      current = String(Number(value.toPrecision(11)));
      resultEl.textContent = pretty(value);
      history.unshift({ expression: fullExpression, result: pretty(value), raw: current });
      if (history.length > 8) history.pop();
      renderHistory();
    }
    stored = null; operator = null; waitingForOperand = false; justEvaluated = true;
    modeLabel.textContent = "CONCLUÍDO";
  };
  const percent = () => {
    if (current === "Erro") return;
    current = String(numeric() / 100);
    waitingForOperand = false; justEvaluated = false;
    show();
  };
  const sign = () => {
    if (current === "Erro" || numeric() === 0) return;
    current = String(-numeric()); show();
  };
  const renderHistory = () => {
    if (!history.length) {
      historyEl.innerHTML = '<div class="empty-state"><span class="empty-icon">↗</span><p>Suas contas recentes<br>aparecerão aqui.</p></div>';
      return;
    }
    historyEl.innerHTML = "";
    history.forEach((item, index) => {
      const row = document.createElement("button");
      row.className = "history-item";
      row.type = "button";
      row.style.width = "100%";
      row.style.textAlign = "left";
      row.style.borderTop = "0";
      row.style.borderLeft = "0";
      row.style.borderRight = "0";
      row.style.background = "transparent";
      row.innerHTML = `<span><span class="history-expression"></span><span class="history-result"></span></span><span class="history-use">↗</span>`;
      row.querySelector(".history-expression").textContent = item.expression;
      row.querySelector(".history-result").textContent = item.result;
      row.setAttribute("aria-label", `Usar resultado ${item.result}`);
      row.addEventListener("click", () => {
        current = item.raw; stored = null; operator = null;
        waitingForOperand = false; justEvaluated = true;
        expressionEl.textContent = item.expression + " =";
        resultEl.textContent = item.result; modeLabel.textContent = "HISTÓRICO";
      });
      historyEl.appendChild(row);
    });
  };

  keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.value !== undefined) {
      const value = button.dataset.value;
      if (/^\d$/.test(value)) inputDigit(value);
      else chooseOperator(value);
      return;
    }
    switch (button.dataset.action) {
      case "clear": clear(); break;
      case "sign": sign(); break;
      case "percent": percent(); break;
      case "decimal": inputDecimal(); break;
      case "backspace": backspace(); break;
      case "equals": equals(); break;
    }
  });
  document.querySelector("#clear-history").addEventListener("click", () => {
    history.length = 0; renderHistory();
  });
  document.querySelector("#theme-toggle").addEventListener("click", () => {
    document.body.classList.toggle("light");
    const light = document.body.classList.contains("light");
    document.querySelector("#theme-toggle").textContent = light ? "☾" : "☼";
    document.querySelector("#theme-toggle").setAttribute("aria-label", light ? "Ativar tema escuro" : "Ativar tema claro");
  });
  document.addEventListener("keydown", (event) => {
    if (/^\d$/.test(event.key)) inputDigit(event.key);
    else if (event.key === "." || event.key === ",") inputDecimal();
    else if (event.key === "Enter" || event.key === "=") { event.preventDefault(); equals(); }
    else if (event.key === "Escape") clear();
    else if (event.key === "Backspace") backspace();
    else if (event.key === "+") chooseOperator("+");
    else if (event.key === "-") chooseOperator("−");
    else if (event.key === "*") chooseOperator("×");
    else if (event.key === "/") { event.preventDefault(); chooseOperator("÷"); }
    else if (event.key === "%") percent();
  });
})();
