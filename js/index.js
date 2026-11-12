(function () {
  const state = {
    headers: [],
    rows: [],
    processedRows: [],
    duplicateGroups: [],
    keepByPhone: new Map(),
    manualMerges: new Map(),
    fileName: "",
    phoneColumn: "",
    phoneColumns: [],
    nameColumn: "",
    activeMergePhone: "",
    renderedRowsLimit: 100,
    statusFilter: "all",
    sortMode: "original",
    selectedRowIds: new Set(),
    activeView: "dashboard",
  };

  const ARGENTINA_AREA_CODES = [
    "2966",
    "2954",
    "2920",
    "2901",
    "388",
    "387",
    "385",
    "383",
    "381",
    "380",
    "379",
    "376",
    "370",
    "362",
    "351",
    "343",
    "342",
    "299",
    "280",
    "266",
    "264",
    "261",
    "221",
    "11",
  ];
  const ARGENTINA_NATIONAL_PHONE_LENGTHS = [10, 11];
  const ACTIVE_VIEW_STORAGE_KEY = "useful-tools-active-view";

  const els = {};
  let mergeModal = null;
  let columnsModal = null;
  let columnsSortable = null;

  document.addEventListener("DOMContentLoaded", function () {
    cacheElements();
    bindEvents();
    mergeModal = new bootstrap.Modal(els.mergeModal);
    columnsModal = new bootstrap.Modal(els.columnsModal);
    setActiveView(getStoredActiveView());
    renderAll();
    registerOfflineSupport();
  });

  function cacheElements() {
    els.fileInput = document.getElementById("fileInput");
    els.viewButtons = document.querySelectorAll("[data-view-target]");
    els.dashboardView = document.getElementById("dashboardView");
    els.excelView = document.getElementById("excelView");
    els.linksView = document.getElementById("linksView");
    els.whatsappPhoneInput = document.getElementById("whatsappPhoneInput");
    els.whatsappMessageInput = document.getElementById("whatsappMessageInput");
    els.generatedWhatsappLinkInput = document.getElementById("generatedWhatsappLinkInput");
    els.emojiPicker = document.getElementById("emojiPicker");
    els.copyWhatsappLinkButton = document.getElementById("copyWhatsappLinkButton");
    els.openWhatsappLinkButton = document.getElementById("openWhatsappLinkButton");
    els.clearWhatsappLinkButton = document.getElementById("clearWhatsappLinkButton");
    els.whatsappLinkStatus = document.getElementById("whatsappLinkStatus");
    els.combineDuplicatesButton = document.getElementById("combineDuplicatesButton");
    els.editColumnsButton = document.getElementById("editColumnsButton");
    els.bulkActionsBar = document.getElementById("bulkActionsBar");
    els.bulkSelectionInfo = document.getElementById("bulkSelectionInfo");
    els.selectAllRowsButton = document.getElementById("selectAllRowsButton");
    els.bulkArgentinaCodeButton = document.getElementById("bulkArgentinaCodeButton");
    els.bulkDeleteRowsButton = document.getElementById("bulkDeleteRowsButton");
    els.exportDropdownButton = document.getElementById("exportDropdownButton");
    els.exportCsvButton = document.getElementById("exportCsvButton");
    els.exportXlsxButton = document.getElementById("exportXlsxButton");
    els.exportVcfButton = document.getElementById("exportVcfButton");
    els.resetButton = document.getElementById("resetButton");
    els.previewTableHead = document.getElementById("previewTableHead");
    els.previewTableBody = document.getElementById("previewTableBody");
    els.tableInfo = document.getElementById("tableInfo");
    els.statusFilterSelect = document.getElementById("statusFilterSelect");
    els.sortSelect = document.getElementById("sortSelect");
    els.dataTableWrap = document.querySelector(".data-table-wrap");
    els.statusAlert = document.getElementById("statusAlert");
    els.mergeModal = document.getElementById("mergeModal");
    els.duplicateGroupSelect = document.getElementById("duplicateGroupSelect");
    els.mergeSourceRows = document.getElementById("mergeSourceRows");
    els.mergeFields = document.getElementById("mergeFields");
    els.saveMergeButton = document.getElementById("saveMergeButton");
    els.columnsModal = document.getElementById("columnsModal");
    els.addColumnButton = document.getElementById("addColumnButton");
    els.columnsList = document.getElementById("columnsList");
    els.deleteColumnsButton = document.getElementById("deleteColumnsButton");
  }

  function bindEvents() {
    els.viewButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        setActiveView(button.dataset.viewTarget);
      });
    });
    els.whatsappPhoneInput.addEventListener("input", handleWhatsappLinkInput);
    els.whatsappMessageInput.addEventListener("input", renderWhatsappLink);
    els.emojiPicker.addEventListener("emoji-click", handleEmojiSelection);
    els.copyWhatsappLinkButton.addEventListener("click", copyWhatsappLink);
    els.openWhatsappLinkButton.addEventListener("click", openWhatsappLink);
    els.clearWhatsappLinkButton.addEventListener("click", clearWhatsappLink);
    els.fileInput.addEventListener("change", handleFileChange);
    els.previewTableBody.addEventListener("click", handleEmptyImportClick);
    els.previewTableBody.addEventListener("keydown", handleEmptyImportKeydown);
    els.previewTableBody.addEventListener("input", handleTableCellInput);
    els.previewTableBody.addEventListener("change", handleTableCellCommit);
    els.previewTableBody.addEventListener("change", handleRowSelectionChange);
    els.previewTableHead.addEventListener("change", handleVisibleSelectionToggle);
    els.mergeFields.addEventListener("input", handleMergeFieldInput);
    els.combineDuplicatesButton.addEventListener("click", openMergeModal);
    els.editColumnsButton.addEventListener("click", openColumnsModal);
    els.selectAllRowsButton.addEventListener("click", selectAllRows);
    els.bulkArgentinaCodeButton.addEventListener("click", addArgentinaCountryCodeToSelectedRows);
    els.bulkDeleteRowsButton.addEventListener("click", deleteSelectedTableRows);
    els.duplicateGroupSelect.addEventListener("change", function () {
      state.activeMergePhone = els.duplicateGroupSelect.value;
      renderMergeModalContent();
    });
    els.saveMergeButton.addEventListener("click", saveManualMerge);
    els.columnsList.addEventListener("change", updateDeleteColumnsButton);
    els.columnsList.addEventListener("change", handleColumnRename);
    els.addColumnButton.addEventListener("click", addColumn);
    els.deleteColumnsButton.addEventListener("click", deleteSelectedColumns);
    els.dataTableWrap.addEventListener("scroll", handlePreviewScroll);
    els.statusFilterSelect.addEventListener("change", function () {
      state.statusFilter = els.statusFilterSelect.value;
      resetRenderedRows();
      renderAll();
      updateControls();
    });
    els.sortSelect.addEventListener("change", function () {
      state.sortMode = els.sortSelect.value;
      resetRenderedRows();
      renderAll();
      updateControls();
    });
    els.exportCsvButton.addEventListener("click", function () {
      exportRows("csv");
    });
    els.exportXlsxButton.addEventListener("click", function () {
      exportRows("xlsx");
    });
    els.exportVcfButton.addEventListener("click", function () {
      exportRows("vcf");
    });
    els.resetButton.addEventListener("click", resetState);
  }

  function setActiveView(viewName) {
    state.activeView = ["dashboard", "excel", "links"].includes(viewName) ? viewName : "dashboard";
    storeActiveView(state.activeView);

    els.dashboardView.classList.toggle("d-none", state.activeView !== "dashboard");
    els.excelView.classList.toggle("d-none", state.activeView !== "excel");
    els.linksView.classList.toggle("d-none", state.activeView !== "links");

    els.viewButtons.forEach(function (button) {
      button.classList.toggle("active", button.dataset.viewTarget === state.activeView);
    });
  }

  function getStoredActiveView() {
    try {
      return localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY) || state.activeView;
    } catch (error) {
      return state.activeView;
    }
  }

  function storeActiveView(viewName) {
    try {
      localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, viewName);
    } catch (error) {
      return;
    }
  }

  function registerOfflineSupport() {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("sw.js").catch(function () {
      return;
    });
  }

  function handleWhatsappLinkInput() {
    els.whatsappPhoneInput.value = formatPhoneNumber(els.whatsappPhoneInput.value);
    renderWhatsappLink();
  }

  function renderWhatsappLink() {
    const link = buildWhatsappLink(
      els.whatsappPhoneInput.value,
      els.whatsappMessageInput.value
    );
    const hasLink = link !== "";

    els.generatedWhatsappLinkInput.value = link;
    els.copyWhatsappLinkButton.disabled = !hasLink;
    els.openWhatsappLinkButton.disabled = !hasLink;
    els.clearWhatsappLinkButton.disabled = !hasLink && normalizeCell(els.whatsappMessageInput.value) === "";
    els.whatsappLinkStatus.textContent = hasLink ? "Enlace listo para copiar o abrir." : "Sin enlace generado.";
  }

  function buildWhatsappLink(phoneValue, messageValue) {
    const phone = formatPhoneNumber(phoneValue);
    const message = normalizeCell(messageValue);

    if (!phone) return "";

    const baseUrl = "https://api.whatsapp.com/send?phone=" + phone;
    return message ? baseUrl + "&text=" + encodeURIComponent(message) : baseUrl;
  }

  function handleEmojiSelection(event) {
    const emoji = event.detail && event.detail.unicode;
    if (!emoji) return;

    insertTextAtCursor(els.whatsappMessageInput, emoji);
    renderWhatsappLink();
  }

  function insertTextAtCursor(input, text) {
    const start = typeof input.selectionStart === "number" ? input.selectionStart : input.value.length;
    const end = typeof input.selectionEnd === "number" ? input.selectionEnd : input.value.length;

    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    input.focus();
    input.setSelectionRange(start + text.length, start + text.length);
  }

  async function copyWhatsappLink() {
    const link = els.generatedWhatsappLinkInput.value;
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      els.whatsappLinkStatus.textContent = "Enlace copiado.";
    } catch (error) {
      els.generatedWhatsappLinkInput.select();
      document.execCommand("copy");
      els.whatsappLinkStatus.textContent = "Enlace copiado.";
    }
  }

  function openWhatsappLink() {
    const link = els.generatedWhatsappLinkInput.value;
    if (!link) return;

    window.open(link, "_blank", "noopener,noreferrer");
  }

  function clearWhatsappLink() {
    els.whatsappPhoneInput.value = "";
    els.whatsappMessageInput.value = "";
    renderWhatsappLink();
  }


  function handleEmptyImportClick(event) {
    if (!event.target.closest(".empty-import-zone")) return;
    els.fileInput.click();
  }

  function handleEmptyImportKeydown(event) {
    if (!event.target.closest(".empty-import-zone")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    els.fileInput.click();
  }

  function handleRowSelectionChange(event) {
    const input = event.target.closest(".row-select-check");
    if (!input) return;

    if (input.checked) {
      state.selectedRowIds.add(input.value);
    } else {
      state.selectedRowIds.delete(input.value);
    }

    renderTableInfo();
    updateControls();
  }

  function handleVisibleSelectionToggle(event) {
    const input = event.target.closest("#selectVisibleRowsCheck");
    if (!input) return;

    setRowsSelection(getVisibleRows(), input.checked);
    renderAll();
    updateControls();
  }

  function handlePreviewScroll() {
    const remainingScroll = els.dataTableWrap.scrollHeight - els.dataTableWrap.scrollTop - els.dataTableWrap.clientHeight;
    if (remainingScroll > 240) return;

    const visibleRows = getVisibleRows();
    if (state.renderedRowsLimit >= visibleRows.length) return;

    commitAllEditableInputs();
    state.renderedRowsLimit = Math.min(state.renderedRowsLimit + 100, visibleRows.length);
    renderTableInfo();
    renderPreviewTable();
  }
  async function handleFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      setStatus("Leyendo archivo...", "secondary");

      if (isVcfFile(file)) {
        const text = await file.text();
        loadMatrix(parseVcfToMatrix(text), file.name);
        setStatus("Archivo procesado automaticamente.", "success");
        return;
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error("El archivo no tiene hojas disponibles.");
      }

      const worksheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json(worksheet, {
        blankrows: false,
        defval: "",
        header: 1,
        raw: false,
      });

      loadMatrix(matrix, file.name);
      setStatus("Archivo procesado automaticamente.", "success");
    } catch (error) {
      resetImportedData();
      setStatus(error.message || "No se pudo leer el archivo.", "danger");
    }
  }

  function isVcfFile(file) {
    return /\.vcf$/i.test(file.name) || file.type === "text/vcard" || file.type === "text/x-vcard";
  }

  function parseVcfToMatrix(text) {
    const rows = [];
    let card = null;

    unfoldVcfLines(text).forEach(function (line) {
      const trimmedLine = line.trim();
      if (/^BEGIN:VCARD$/i.test(trimmedLine)) {
        card = createEmptyVcfCard();
        return;
      }

      if (/^END:VCARD$/i.test(trimmedLine)) {
        appendVcfCardRows(rows, card);
        card = null;
        return;
      }

      if (!card) return;

      const entry = parseVcfLine(trimmedLine);
      if (!entry) return;

      if (entry.name === "FN") {
        card.name = entry.value;
        return;
      }

      if (entry.name === "N") {
        card.fallbackName = parseVcfName(entry.value);
        return;
      }

      if (entry.name === "TEL") {
        const phone = entry.value.replace(/^tel:/i, "");
        if (normalizeCell(phone) !== "") {
          card.phones.push(phone);
        }
      }
    });

    appendVcfCardRows(rows, card);

    if (rows.length === 0) {
      throw new Error("El archivo VCF no tiene contactos con telefono.");
    }

    return [["phone", "name"]].concat(rows);
  }

  function createEmptyVcfCard() {
    return {
      fallbackName: "",
      name: "",
      phones: [],
    };
  }

  function appendVcfCardRows(rows, card) {
    if (!card || card.phones.length === 0) return;

    const name = card.name || card.fallbackName;
    card.phones.forEach(function (phone) {
      rows.push([phone, name]);
    });
  }

  function unfoldVcfLines(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .reduce(function (lines, line) {
        if (/^[ \t]/.test(line) && lines.length > 0) {
          lines[lines.length - 1] += line.slice(1);
        } else {
          lines.push(line);
        }

        return lines;
      }, []);
  }

  function parseVcfLine(line) {
    const colonIndex = line.indexOf(":");
    if (colonIndex < 0) return null;

    const nameAndParams = line.slice(0, colonIndex);
    const rawValue = line.slice(colonIndex + 1);
    const parts = nameAndParams.split(";");
    const propertyName = parts[0].split(".").pop().toUpperCase();
    const params = parts.slice(1).join(";").toUpperCase();
    const decodedValue = params.includes("ENCODING=QUOTED-PRINTABLE")
      ? decodeQuotedPrintable(rawValue)
      : rawValue;

    return {
      name: propertyName,
      value: unescapeVcfText(decodedValue),
    };
  }

  function parseVcfName(value) {
    const parts = String(value || "").split(";").map(function (part) {
      return unescapeVcfText(part);
    });

    return [parts[3], parts[1], parts[2], parts[0], parts[4]]
      .filter(function (part) {
        return normalizeCell(part) !== "";
      })
      .join(" ");
  }

  function unescapeVcfText(value) {
    return String(value || "")
      .replace(/\\n/gi, " ")
      .replace(/\\,/g, ",")
      .replace(/\\;/g, ";")
      .replace(/\\\\/g, "\\")
      .trim();
  }

  function decodeQuotedPrintable(value) {
    const cleanedValue = String(value || "").replace(/=\r?\n/g, "");
    const bytes = [];

    for (let index = 0; index < cleanedValue.length; index += 1) {
      const char = cleanedValue[index];
      const hex = cleanedValue.slice(index + 1, index + 3);

      if (char === "=" && /^[0-9A-F]{2}$/i.test(hex)) {
        bytes.push(parseInt(hex, 16));
        index += 2;
      } else {
        bytes.push(cleanedValue.charCodeAt(index));
      }
    }

    try {
      return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
    } catch (error) {
      return cleanedValue.replace(/=([0-9A-F]{2})/gi, function (_, hex) {
        return String.fromCharCode(parseInt(hex, 16));
      });
    }
  }

  function loadMatrix(matrix, fileName) {
    if (!Array.isArray(matrix) || matrix.length === 0) {
      throw new Error("El archivo esta vacio.");
    }

    const headers = makeUniqueHeaders(matrix[0]);
    const phoneColumns = detectPhoneColumns(headers);
    const phoneColumn = phoneColumns[0] || detectPhoneColumn(headers);
    const baseRows = matrix.slice(1)
      .filter(function (row) {
        return row.some(function (value) {
          return String(value || "").trim() !== "";
        });
      })
      .map(function (row, index) {
        const data = {};
        headers.forEach(function (header, headerIndex) {
          data[header] = normalizeCell(row[headerIndex]);
        });

        return {
          id: "row-" + index,
          sourceRowNumber: index + 2,
          data: data,
        };
      });
    const rows = expandRowsByPhoneValues(baseRows, phoneColumn).map(function (row, index) {
      return Object.assign({}, row, {
        id: "row-" + index,
      });
    });

    if (rows.length === 0) {
      throw new Error("El archivo no tiene filas de datos.");
    }

    state.headers = headers;
    state.rows = rows;
    state.fileName = fileName;
    state.phoneColumn = phoneColumn;
    state.phoneColumns = phoneColumns.length > 0 ? phoneColumns : (phoneColumn ? [phoneColumn] : []);
    state.nameColumn = detectNameColumn(headers);
    state.statusFilter = "all";
    state.sortMode = "original";
    state.selectedRowIds.clear();
    resetRenderedRows();
    clearProcessedState();

    processRows({ silent: true });
  }

  function expandRowsByPhoneValues(rows, phoneColumn) {
    if (!phoneColumn) return rows;

    return rows.reduce(function (expandedRows, row) {
      const phoneValues = extractPhoneValues(row.data[phoneColumn]);

      if (phoneValues.length <= 1) {
        const nextRow = cloneRow(row);
        nextRow.data[phoneColumn] = phoneValues[0] || row.data[phoneColumn];
        expandedRows.push(nextRow);
        return expandedRows;
      }

      phoneValues.forEach(function (phoneValue, phoneIndex) {
        const nextRow = cloneRow(row);
        nextRow.sourceRowNumber = row.sourceRowNumber + "." + (phoneIndex + 1);
        nextRow.data[phoneColumn] = phoneValue;
        expandedRows.push(nextRow);
      });

      return expandedRows;
    }, []);
  }

  function cloneRow(row) {
    return {
      sourceRowNumber: row.sourceRowNumber,
      data: Object.assign({}, row.data),
    };
  }

  function extractPhoneValues(value) {
    const rawValue = normalizeCell(value);
    if (!rawValue) return [""];

    const matches = rawValue.match(/\+?\d[\d\s().-]{5,}\d/g);
    if (!matches || matches.length === 0) return [rawValue];

    return matches
      .flatMap(function (match) {
        return splitGluedArgentinaPhones(match);
      })
      .filter(function (match) {
        return formatPhoneNumber(match) !== "";
      });
  }

  function splitGluedArgentinaPhones(value) {
    const rawValue = normalizeCell(value);
    const phone = formatPhoneNumber(rawValue);
    if (!phone) return [];

    const gluedPhones = splitGluedArgentinaDigits(phone);
    if (gluedPhones.length > 1) return gluedPhones;

    return [rawValue];
  }

  function splitGluedArgentinaDigits(phone) {
    const sequence = findArgentinaPhoneSequence(phone, 0, new Map());
    return sequence && sequence.length > 1 ? sequence : [phone];
  }

  function findArgentinaPhoneSequence(phone, startIndex, memo) {
    if (startIndex === phone.length) return [];
    if (memo.has(startIndex)) return memo.get(startIndex);

    const remainingPhone = phone.slice(startIndex);
    const candidates = getArgentinaPhoneTokenLengths(remainingPhone);

    for (let index = 0; index < candidates.length; index += 1) {
      const tokenLength = candidates[index];
      const token = remainingPhone.slice(0, tokenLength);
      const rest = findArgentinaPhoneSequence(phone, startIndex + tokenLength, memo);

      if (rest) {
        const sequence = [token].concat(rest);
        memo.set(startIndex, sequence);
        return sequence;
      }
    }

    memo.set(startIndex, null);
    return null;
  }

  function getArgentinaPhoneTokenLengths(phone) {
    const lengths = [];

    ARGENTINA_NATIONAL_PHONE_LENGTHS.forEach(function (nationalLength) {
      const possibleLengths = [
        3 + nationalLength,
        2 + nationalLength,
        1 + nationalLength,
        nationalLength,
      ];

      possibleLengths.forEach(function (length) {
        if (phone.length >= length && parseArgentinaPhone(phone.slice(0, length))) {
          lengths.push(length);
        }
      });
    });

    return lengths
      .filter(function (length, index) {
        return lengths.indexOf(length) === index;
      })
      .sort(function (a, b) {
        return a - b;
      });
  }

  function makeUniqueHeaders(rawHeaders) {
    const counts = new Map();

    return rawHeaders.map(function (header, index) {
      const fallback = "Columna " + (index + 1);
      const base = String(header || fallback).trim() || fallback;
      const currentCount = counts.get(base) || 0;
      counts.set(base, currentCount + 1);

      return currentCount === 0 ? base : base + " " + (currentCount + 1);
    });
  }

  function detectPhoneColumn(headers) {
    const phoneColumns = detectPhoneColumns(headers);
    if (phoneColumns.length > 0) return phoneColumns[0];

    const candidates = [
      "telefono",
      "phone",
      "mobile",
      "celular",
      "cel",
      "whatsapp",
      "numero",
      "number",
    ];

    return headers.find(function (header) {
      const normalized = normalizeHeader(header);
      if (normalized.includes("phonetic")) return false;

      return candidates.some(function (candidate) {
        return normalized.includes(candidate) && !normalized.includes("label");
      });
    }) || headers[0] || "";
  }

  function detectPhoneColumns(headers) {
    return headers.filter(isPhoneValueHeader);
  }

  function isPhoneValueHeader(header) {
    const normalized = normalizeHeader(header);
    if (normalized.includes("phonetic")) return false;

    const hasPhoneName = [
      "telefono",
      "phone",
      "mobile",
      "celular",
      "whatsapp",
      "numero",
      "number",
    ].some(function (candidate) {
      return normalized.includes(candidate);
    });

    if (!hasPhoneName || normalized.includes("label")) return false;
    if (normalized.includes("value") || normalized.includes("valor")) return true;

    return !normalized.includes("email") && !normalized.includes("mail");
  }

  function detectNameColumn(headers) {
    const candidates = ["name", "nombre"];

    return headers.find(function (header) {
      const normalized = normalizeHeader(header);
      return candidates.some(function (candidate) {
        return normalized.includes(candidate);
      });
    }) || "";
  }

  function normalizeHeader(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function normalizeCell(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function formatPhoneNumber(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function selectAllRows() {
    setRowsSelection(getSelectableRows(), true);
    renderAll();
    updateControls();
  }

  function setRowsSelection(rows, isSelected) {
    rows.forEach(function (row) {
      if (isSelected) {
        state.selectedRowIds.add(row.id);
      } else {
        state.selectedRowIds.delete(row.id);
      }
    });
  }

  function getSelectedRows() {
    const selectedIds = state.selectedRowIds;
    return getSelectableRows().filter(function (row) {
      return selectedIds.has(row.id);
    });
  }

  function deleteSelectedTableRows() {
    const selectedRowIds = getSelectedRows().map(function (row) {
      return row.id;
    });

    if (selectedRowIds.length === 0) {
      setStatus("Selecciona al menos una fila para eliminar.", "warning");
      return;
    }

    deleteRowsByIds(selectedRowIds);
  }

  function deleteRowsByIds(rowIds) {
    const rowIdSet = new Set(rowIds.filter(Boolean));
    if (rowIdSet.size === 0) return;

    commitAllEditableInputs();
    removeAffectedManualMerges(rowIdSet);

    const previousCount = state.rows.length;
    state.rows = state.rows.filter(function (row) {
      return !rowIdSet.has(row.id);
    });
    state.processedRows = state.processedRows.filter(function (row) {
      return !rowIdSet.has(row.id);
    });
    rowIdSet.forEach(function (rowId) {
      state.selectedRowIds.delete(rowId);
    });

    if (state.rows.length === 0) {
      resetImportedData();
      setStatus("Todas las filas fueron eliminadas.", "success");
      return;
    }

    rebuildDuplicateState();
    state.renderedRowsLimit = Math.min(state.renderedRowsLimit, Math.max(getVisibleRows().length, 100));
    renderAll();
    updateControls();

    setStatus((previousCount - state.rows.length) + " filas eliminadas.", "success");
  }

  function removeAffectedManualMerges(rowIdSet) {
    state.duplicateGroups.forEach(function (group) {
      const touchesGroup = group.rows.some(function (row) {
        return rowIdSet.has(row.id);
      });

      if (touchesGroup) {
        state.keepByPhone.delete(group.phone);
        state.manualMerges.delete(group.phone);
      }
    });
  }

  function openColumnsModal() {
    if (state.headers.length === 0) {
      setStatus("No hay columnas para editar.", "warning");
      return;
    }

    renderColumnsModalContent();
    columnsModal.show();
  }

  function renderColumnsModalContent() {
    els.columnsList.innerHTML = state.headers.map(function (header, index) {
      return [
        "<div class=\"column-choice d-flex align-items-center gap-3\" data-column-header=\"" + escapeAttribute(header) + "\">",
        "<span class=\"column-drag-handle text-secondary\" role=\"button\" aria-label=\"Mover columna " + escapeAttribute(header) + "\"><i class=\"bi bi-grip-vertical\"></i></span>",
        "<input class=\"form-check-input column-delete-check\" type=\"checkbox\" value=\"" + escapeAttribute(header) + "\" aria-label=\"Eliminar columna " + escapeAttribute(header) + "\">",
        "<div class=\"flex-grow-1\">",
        "<input class=\"form-control form-control-sm column-name-input\" type=\"text\" value=\"" + escapeAttribute(header) + "\" data-original-header=\"" + escapeAttribute(header) + "\" aria-label=\"Renombrar columna " + escapeAttribute(header) + "\">",
        "</div>",
        "<span class=\"column-order-label text-secondary small\">Columna " + (index + 1) + "</span>",
        "</div>",
      ].join("");
    }).join("");

    updateDeleteColumnsButton();
    initializeColumnsSortable();
  }

  function initializeColumnsSortable() {
    if (columnsSortable) {
      columnsSortable.destroy();
      columnsSortable = null;
    }

    if (!window.Sortable || !els.columnsList) return;

    columnsSortable = Sortable.create(els.columnsList, {
      animation: 150,
      handle: ".column-drag-handle",
      onEnd: reorderColumnsFromModal,
    });
  }

  function reorderColumnsFromModal() {
    const nextHeaders = Array.from(els.columnsList.querySelectorAll(".column-choice"))
      .map(function (item) {
        return item.dataset.columnHeader;
      })
      .filter(function (header) {
        return state.headers.includes(header);
      });

    if (nextHeaders.length !== state.headers.length) return;

    state.headers = nextHeaders;
    renderColumnOrderLabels();
    renderAll();
    updateControls();
    setStatus("Orden de columnas actualizado.", "success");
  }

  function renderColumnOrderLabels() {
    els.columnsList.querySelectorAll(".column-order-label").forEach(function (label, index) {
      label.textContent = "Columna " + (index + 1);
    });
  }

  function addColumn() {
    const header = createUniqueHeader("Nueva columna");
    state.headers.push(header);

    addColumnToRows(state.rows, header);
    addColumnToRows(state.processedRows, header);

    state.manualMerges.forEach(function (data) {
      data[header] = "";
    });

    renderColumnsModalContent();
    renderAll();
    updateControls();
    setStatus("Columna agregada.", "success");
  }

  function createUniqueHeader(baseHeader) {
    let header = baseHeader;
    let index = 2;

    while (state.headers.includes(header)) {
      header = baseHeader + " " + index;
      index += 1;
    }

    return header;
  }

  function addColumnToRows(rows, header) {
    rows.forEach(function (row) {
      row.data[header] = "";
    });
  }

  function handleColumnRename(event) {
    const input = event.target.closest(".column-name-input");
    if (!input) return;

    const oldHeader = input.dataset.originalHeader;
    const newHeader = normalizeCell(input.value);

    if (!newHeader || newHeader === oldHeader) {
      input.value = oldHeader;
      return;
    }

    if (state.headers.includes(newHeader)) {
      input.value = oldHeader;
      setStatus("Ya existe una columna con ese nombre.", "warning");
      return;
    }

    renameColumn(oldHeader, newHeader);
    renderColumnsModalContent();
    renderAll();
    updateControls();
    setStatus("Columna renombrada.", "success");
  }

  function renameColumn(oldHeader, newHeader) {
    state.headers = state.headers.map(function (header) {
      return header === oldHeader ? newHeader : header;
    });

    renameColumnInRows(state.rows, oldHeader, newHeader);
    renameColumnInRows(state.processedRows, oldHeader, newHeader);

    state.manualMerges.forEach(function (data) {
      renameColumnInData(data, oldHeader, newHeader);
    });

    if (state.phoneColumn === oldHeader) {
      state.phoneColumn = newHeader;
    }

    state.phoneColumns = state.phoneColumns.map(function (header) {
      return header === oldHeader ? newHeader : header;
    });

    if (state.nameColumn === oldHeader) {
      state.nameColumn = newHeader;
    }
  }

  function renameColumnInRows(rows, oldHeader, newHeader) {
    rows.forEach(function (row) {
      renameColumnInData(row.data, oldHeader, newHeader);
    });
  }

  function renameColumnInData(data, oldHeader, newHeader) {
    if (!Object.prototype.hasOwnProperty.call(data, oldHeader)) return;

    data[newHeader] = data[oldHeader];
    delete data[oldHeader];
  }

  function updateDeleteColumnsButton() {
    const selectedCount = getSelectedColumnsForDelete().length;
    els.deleteColumnsButton.disabled = selectedCount === 0;
  }

  function getSelectedColumnsForDelete() {
    return Array.from(els.columnsList.querySelectorAll(".column-delete-check:checked"))
      .map(function (input) {
        return input.value;
      });
  }

  function deleteSelectedColumns() {
    const selectedColumns = getSelectedColumnsForDelete();

    if (selectedColumns.length === 0) {
      setStatus("Selecciona al menos una columna para eliminar.", "warning");
      return;
    }

    if (selectedColumns.length >= state.headers.length) {
      setStatus("No podes eliminar todas las columnas.", "warning");
      return;
    }

    commitAllEditableInputs();

    const selectedColumnSet = new Set(selectedColumns);
    const removedPhoneColumn = selectedColumnSet.has(state.phoneColumn);
    const removedAnyPhoneColumn = selectedColumns.some(function (header) {
      return state.phoneColumns.includes(header);
    });
    const removedNameColumn = selectedColumnSet.has(state.nameColumn);

    state.headers = state.headers.filter(function (header) {
      return !selectedColumnSet.has(header);
    });
    state.phoneColumns = state.phoneColumns.filter(function (header) {
      return !selectedColumnSet.has(header);
    });

    state.rows.forEach(function (row) {
      removeColumnsFromData(row.data, selectedColumns);
    });

    state.processedRows.forEach(function (row) {
      removeColumnsFromData(row.data, selectedColumns);
    });

    state.manualMerges.forEach(function (data) {
      removeColumnsFromData(data, selectedColumns);
    });

    if (removedPhoneColumn) {
      state.phoneColumn = state.phoneColumns[0] || detectPhoneColumn(state.headers);
      if (state.phoneColumn && !state.phoneColumns.includes(state.phoneColumn)) {
        state.phoneColumns = [state.phoneColumn];
      }
      resetRenderedRows();
      clearProcessedState();

      if (state.phoneColumn) {
        processRows({ silent: true });
      } else {
        renderAll();
        updateControls();
      }
    } else {
      state.nameColumn = removedNameColumn ? detectNameColumn(state.headers) : state.nameColumn;
      resetRenderedRows();
      if (removedAnyPhoneColumn) {
        processRows({ silent: true });
      } else {
        rebuildDuplicateState();
      }
      renderAll();
      updateControls();
    }

    columnsModal.hide();
    setStatus(selectedColumns.length + " columnas eliminadas.", "success");
  }

  function removeColumnsFromData(data, columns) {
    columns.forEach(function (header) {
      delete data[header];
    });
  }
  function addArgentinaCountryCodeToSelectedRows() {
    commitAllEditableInputs();

    if (!state.phoneColumn || state.processedRows.length === 0) {
      setStatus("No hay telefonos para corregir.", "warning");
      return;
    }

    const selectedRows = getSelectedRows();
    if (selectedRows.length === 0) {
      setStatus("Selecciona al menos una fila para aplicar codigo Argentina.", "warning");
      return;
    }

    const selectedRowIds = new Set(selectedRows.map(function (row) {
      return row.id;
    }));
    let changedCount = 0;

    state.processedRows.forEach(function (row) {
      if (!selectedRowIds.has(row.id)) return;

      const currentPhone = formatPhoneNumber(row.data[state.phoneColumn]);
      const argentinaPhone = normalizeArgentinaPhone(currentPhone);

      if (argentinaPhone === currentPhone) return;

      row.data[state.phoneColumn] = argentinaPhone;
      row.originalPhone = argentinaPhone;
      row.formattedPhone = argentinaPhone;
      row.status = argentinaPhone ? "ok" : "empty";

      const sourceRow = findSourceRow(row.id);
      if (sourceRow) {
        sourceRow.data[state.phoneColumn] = argentinaPhone;
      }

      changedCount += 1;
    });

    state.keepByPhone = new Map();
    state.manualMerges = new Map();
    rebuildDuplicateState();
    renderAll();
    updateControls();

    if (changedCount === 0) {
      setStatus("No habia telefonos de Argentina para corregir.", "secondary");
      return;
    }

    setStatus("Prefijo argentino 549 aplicado a " + changedCount + " telefonos.", "success");
  }

  function normalizeArgentinaPhone(value) {
    const phone = formatPhoneNumber(value);
    if (!phone) return phone;

    const parsedPhone = parseArgentinaPhone(phone);
    if (!parsedPhone) return phone;

    return "549" + parsedPhone.areaCode + parsedPhone.localNumber;
  }

  function parseArgentinaPhone(phone) {
    const candidates = buildArgentinaPhoneCandidates(phone);

    for (let index = 0; index < candidates.length; index += 1) {
      const parsedPhone = splitArgentinaAreaCode(candidates[index]);
      if (parsedPhone) return parsedPhone;
    }

    return null;
  }

  function buildArgentinaPhoneCandidates(phone) {
    const normalizedPhone = phone.replace(/^0+/, "");
    const candidates = [];

    function addCandidate(candidate) {
      const cleanCandidate = String(candidate || "").replace(/^0+/, "");
      if (!cleanCandidate) return;

      candidates.push(cleanCandidate);

      if (cleanCandidate.startsWith("15")) {
        candidates.push("11" + cleanCandidate.slice(2));
      }

      if (cleanCandidate.length === 8) {
        candidates.push("11" + cleanCandidate);
      }
    }

    if (phone.startsWith("549")) {
      addCandidate(phone.slice(3));
    } else if (phone.startsWith("54")) {
      addCandidate(phone.slice(2));
    } else if (phone.startsWith("9")) {
      addCandidate(phone.slice(1));
    }

    addCandidate(normalizedPhone);

    return candidates.filter(function (candidate, index) {
      return candidate && candidates.indexOf(candidate) === index;
    });
  }

  function splitArgentinaAreaCode(phone) {
    if (!ARGENTINA_NATIONAL_PHONE_LENGTHS.includes(phone.length)) return null;

    const areaCode = ARGENTINA_AREA_CODES.find(function (code) {
      return phone.startsWith(code) && phone.length > code.length;
    });

    if (!areaCode) return null;

    return {
      areaCode: areaCode,
      localNumber: phone.slice(areaCode.length),
    };
  }

  function processRows(options) {
    const opts = options || {};

    if (!state.phoneColumn) {
      setStatus("Selecciona una columna de telefono.", "warning");
      renderAll();
      updateControls();
      return false;
    }

    state.processedRows = state.rows.map(function (row) {
      const originalPhone = row.data[state.phoneColumn];
      const data = Object.assign({}, row.data);

      state.phoneColumns.forEach(function (header) {
        data[header] = normalizeArgentinaPhone(data[header]);
      });

      const formattedPhone = data[state.phoneColumn] || "";

      return {
        id: row.id,
        sourceRowNumber: row.sourceRowNumber,
        data: data,
        originalPhone: originalPhone,
        formattedPhone: formattedPhone,
        status: formattedPhone ? "ok" : "empty",
      };
    });

    state.keepByPhone = new Map();
    state.manualMerges = new Map();
    rebuildDuplicateState();

    if (!opts.silent) {
      setStatus("Datos procesados.", "success");
    }

    renderAll();
    updateControls();
    return true;
  }

  function rebuildDuplicateState() {
    const previousKeepByPhone = new Map(state.keepByPhone);
    const previousManualMerges = new Map(state.manualMerges);

    state.processedRows.forEach(function (row) {
      row.status = row.formattedPhone ? "ok" : "empty";
    });

    state.duplicateGroups = findDuplicateGroups(state.processedRows);
    state.keepByPhone = new Map();
    state.manualMerges = new Map();

    state.duplicateGroups.forEach(function (group) {
      const previousKeepId = previousKeepByPhone.get(group.phone);
      const keepRow = group.rows.find(function (row) {
        return row.id === previousKeepId;
      }) || group.rows[0];

      state.keepByPhone.set(group.phone, keepRow.id);
      group.rows.forEach(function (row) {
        row.status = "duplicate";
      });

      if (previousManualMerges.has(group.phone)) {
        state.manualMerges.set(group.phone, previousManualMerges.get(group.phone));
      }
    });

    state.activeMergePhone = getPendingDuplicateGroups()[0] ? getPendingDuplicateGroups()[0].phone : "";
  }

  function findDuplicateGroups(rows) {
    const groups = new Map();

    rows.forEach(function (row) {
      if (!row.formattedPhone) return;
      const existingRows = groups.get(row.formattedPhone) || [];
      existingRows.push(row);
      groups.set(row.formattedPhone, existingRows);
    });

    return Array.from(groups.entries())
      .filter(function (entry) {
        return entry[1].length > 1;
      })
      .map(function (entry) {
        return {
          phone: entry[0],
          rows: entry[1],
        };
      });
  }

  function openMergeModal() {
    const pendingGroups = getPendingDuplicateGroups();

    if (pendingGroups.length === 0) {
      setStatus("No hay duplicados para combinar.", "warning");
      return;
    }

    state.activeMergePhone = pendingGroups.some(function (group) {
      return group.phone === state.activeMergePhone;
    }) ? state.activeMergePhone : pendingGroups[0].phone;

    renderMergeModalContent();
    mergeModal.show();
  }

  function renderMergeModalContent() {
    const pendingGroups = getPendingDuplicateGroups();
    const group = pendingGroups.find(function (item) {
      return item.phone === state.activeMergePhone;
    }) || pendingGroups[0];

    if (!group) return;

    state.activeMergePhone = group.phone;
    els.duplicateGroupSelect.innerHTML = pendingGroups.map(function (item) {
      const selected = item.phone === group.phone ? "selected" : "";
      return "<option value=\"" + escapeAttribute(item.phone) + "\" " + selected + ">" + escapeHtml(item.phone) + " (" + item.rows.length + " filas)</option>";
    }).join("");

    const keepId = state.keepByPhone.get(group.phone) || group.rows[0].id;
    els.mergeSourceRows.innerHTML = group.rows.map(function (row) {
      const checked = row.id === keepId ? "checked" : "";
      return [
        "<label class=\"source-choice d-block\">",
        "<div class=\"form-check\">",
        "<input class=\"form-check-input merge-source-radio\" type=\"radio\" name=\"merge-source\" value=\"" + escapeAttribute(row.id) + "\" " + checked + ">",
        "<span class=\"form-check-label fw-semibold\">Fila " + row.sourceRowNumber + "</span>",
        "</div>",
        "<div class=\"small text-secondary mt-2\">Telefono: " + escapeHtml(row.originalPhone || "-") + "</div>",
        "<div class=\"small text-secondary\">Contacto: " + escapeHtml(getBestContactLabel(row)) + "</div>",
        "</label>",
      ].join("");
    }).join("");

    els.mergeSourceRows.querySelectorAll(".merge-source-radio").forEach(function (radio) {
      radio.addEventListener("change", function (event) {
        renderMergeFields(buildDraftFromSource(group, event.target.value));
      });
    });

    renderMergeFields(state.manualMerges.get(group.phone) || buildDraftFromSource(group, keepId));
  }

  function renderMergeFields(data) {
    els.mergeFields.innerHTML = state.headers.map(function (header) {
      const value = data[header] || "";
      const isPhone = state.phoneColumns.includes(header);
      const phoneHint = isPhone ? "<div class=\"form-text\">Solo numeros.</div>" : "";

      return [
        "<div class=\"col-12 col-md-6\">",
        "<label class=\"form-label fw-semibold\">" + escapeHtml(header) + "</label>",
        "<input class=\"form-control merge-field-input\" type=\"text\" inputmode=\"" + (isPhone ? "numeric" : "text") + "\" data-merge-field=\"" + escapeAttribute(header) + "\" value=\"" + escapeAttribute(isPhone ? formatPhoneNumber(value) : value) + "\">",
        phoneHint,
        "</div>",
      ].join("");
    }).join("");
  }

  function handleMergeFieldInput(event) {
    const input = event.target.closest(".merge-field-input");
    if (!input || !state.phoneColumns.includes(input.dataset.mergeField)) return;
    input.value = formatPhoneNumber(input.value);
  }

  function buildDraftFromSource(group, rowId) {
    const keptRow = group.rows.find(function (row) {
      return row.id === rowId;
    }) || group.rows[0];
    const draft = Object.assign({}, keptRow.data);

    group.rows.forEach(function (row) {
      state.headers.forEach(function (header) {
        if (normalizeCell(draft[header]) === "" && normalizeCell(row.data[header]) !== "") {
          draft[header] = row.data[header];
        }
      });
    });

    draft[state.phoneColumn] = keptRow.formattedPhone;
    return draft;
  }

  function saveManualMerge() {
    const phone = els.duplicateGroupSelect.value;
    const group = getDuplicateGroup(phone);
    if (!group) return;

    const selectedSource = els.mergeSourceRows.querySelector(".merge-source-radio:checked");
    if (!selectedSource) {
      setStatus("Elegi una fila base para combinar.", "warning");
      return;
    }

    const data = {};
    els.mergeFields.querySelectorAll(".merge-field-input").forEach(function (input) {
      data[input.dataset.mergeField] = state.phoneColumns.includes(input.dataset.mergeField)
        ? formatPhoneNumber(input.value)
        : normalizeCell(input.value);
    });

    state.keepByPhone.set(phone, selectedSource.value);
    state.manualMerges.set(phone, data);

    renderAll();
    updateControls();
    setStatus("Combinacion guardada. Las filas descartadas se ocultaron de la tabla.", "success");

    if (getPendingDuplicateGroups().length === 0) {
      mergeModal.hide();
      return;
    }

    state.activeMergePhone = getPendingDuplicateGroups()[0].phone;
    renderMergeModalContent();
  }

  function getDuplicateGroup(phone) {
    return state.duplicateGroups.find(function (group) {
      return group.phone === phone;
    });
  }

  function getPendingDuplicateGroups() {
    return state.duplicateGroups.filter(function (group) {
      return !state.manualMerges.has(group.phone);
    });
  }

  function getCleanRows() {
    return getCleanRowsFromRows(state.processedRows);
  }

  function getVisibleCleanRows() {
    return getCleanRowsFromRows(getVisibleRows());
  }

  function getCleanRowsFromRows(rows) {
    if (!rows || rows.length === 0) return [];

    const duplicateRowsByPhone = new Map();
    state.duplicateGroups.forEach(function (group) {
      duplicateRowsByPhone.set(group.phone, group.rows);
    });

    return rows.reduce(function (cleanRows, row) {
      const duplicateRows = duplicateRowsByPhone.get(row.formattedPhone);
      const manualMerge = state.manualMerges.get(row.formattedPhone);

      if (!duplicateRows || !manualMerge) {
        cleanRows.push(row.data);
        return cleanRows;
      }

      const keepId = state.keepByPhone.get(row.formattedPhone);
      if (row.id === keepId) {
        cleanRows.push(manualMerge);
      }

      return cleanRows;
    }, []);
  }

  function renderAll() {
    renderTableInfo();
    renderPreviewTable();
    updateSelectionUi();
  }

  function renderTableInfo() {
    if (state.rows.length === 0) {
      els.tableInfo.textContent = "Click para importar archivo";
      return;
    }

    const visibleRows = getVisibleRows();
    const renderedCount = Math.min(state.renderedRowsLimit, visibleRows.length);
    const rangeText = visibleRows.length > 0
      ? " Mostrando " + renderedCount + "."
      : "";

    els.tableInfo.textContent = visibleRows.length + " filas visibles." + rangeText + " " + getPendingDuplicateGroups().length + " grupos duplicados pendientes.";
  }

  function getVisibleRows() {
    const rows = getSelectableRows();

    const filteredRows = state.statusFilter === "all"
      ? rows
      : rows.filter(function (row) {
        return row.status === state.statusFilter;
      });

    return sortRows(filteredRows);
  }

  function sortRows(rows) {
    if (state.sortMode === "original") return rows;

    return rows.slice().sort(function (a, b) {
      if (state.sortMode === "name-asc") {
        return compareText(getSortName(a), getSortName(b)) || compareSourceRows(a, b);
      }

      if (state.sortMode === "name-desc") {
        return compareText(getSortName(b), getSortName(a)) || compareSourceRows(a, b);
      }

      if (state.sortMode === "phone-asc") {
        return comparePhones(a.formattedPhone, b.formattedPhone) || compareSourceRows(a, b);
      }

      if (state.sortMode === "phone-desc") {
        return comparePhones(b.formattedPhone, a.formattedPhone) || compareSourceRows(a, b);
      }

      if (state.sortMode === "phone-short") {
        return comparePhoneLength(a.formattedPhone, b.formattedPhone) || comparePhones(a.formattedPhone, b.formattedPhone) || compareSourceRows(a, b);
      }

      if (state.sortMode === "phone-long") {
        return comparePhoneLength(b.formattedPhone, a.formattedPhone) || comparePhones(b.formattedPhone, a.formattedPhone) || compareSourceRows(a, b);
      }

      return compareSourceRows(a, b);
    });
  }

  function getSortName(row) {
    const data = getDisplayData(row);
    if (state.nameColumn && normalizeCell(data[state.nameColumn]) !== "") {
      return normalizeCell(data[state.nameColumn]);
    }

    return getBestContactLabel(row);
  }

  function compareText(firstValue, secondValue) {
    return normalizeCell(firstValue).localeCompare(normalizeCell(secondValue), "es", {
      sensitivity: "base",
      numeric: true,
    });
  }

  function comparePhones(firstPhone, secondPhone) {
    const first = formatPhoneNumber(firstPhone).replace(/^0+/, "") || "0";
    const second = formatPhoneNumber(secondPhone).replace(/^0+/, "") || "0";

    if (first.length !== second.length) return first.length - second.length;
    return first.localeCompare(second);
  }

  function comparePhoneLength(firstPhone, secondPhone) {
    return formatPhoneNumber(firstPhone).length - formatPhoneNumber(secondPhone).length;
  }

  function compareSourceRows(firstRow, secondRow) {
    return parseFloat(firstRow.sourceRowNumber) - parseFloat(secondRow.sourceRowNumber);
  }

  function getSelectableRows() {
    if (state.processedRows.length === 0) return state.rows;

    return state.processedRows.filter(function (row) {
      if (row.status !== "duplicate") return true;
      if (!state.manualMerges.has(row.formattedPhone)) return true;
      return row.id === state.keepByPhone.get(row.formattedPhone);
    });
  }

  function getRenderedVisibleRows() {
    const visibleRows = getVisibleRows();
    return visibleRows.slice(0, state.renderedRowsLimit);
  }

  function resetRenderedRows() {
    state.renderedRowsLimit = 100;
    if (els.dataTableWrap) {
      els.dataTableWrap.scrollTop = 0;
    }
  }

  function renderPreviewTable() {
    const rows = getRenderedVisibleRows();

    if (rows.length === 0) {
      els.previewTableHead.innerHTML = "";
      els.previewTableBody.innerHTML = state.rows.length === 0
        ? "<tr><td class=\"empty-state empty-import-zone\" role=\"button\" tabindex=\"0\"><i class=\"bi bi-upload d-block mb-2\"></i>Click para importar archivo</td></tr>"
        : "<tr><td class=\"empty-state\"><i class=\"bi bi-filter d-block mb-2\"></i>Sin filas para este filtro</td></tr>";
      return;
    }

    const displayHeaders = ["Fila"].concat(state.headers, ["Estado"]);
    const headerCells = [
      "<th scope=\"col\" class=\"row-select-cell\"><input id=\"selectVisibleRowsCheck\" class=\"form-check-input\" type=\"checkbox\" aria-label=\"Seleccionar filas visibles\"></th>",
    ].concat(displayHeaders.map(function (header) {
      return "<th scope=\"col\">" + escapeHtml(header) + "</th>";
    }));

    els.previewTableHead.innerHTML = "<tr>" + headerCells.join("") + "</tr>";

    els.previewTableBody.innerHTML = rows.map(function (row) {
      const isDuplicate = row.status === "duplicate";
      const isUnresolvedDuplicate = isDuplicate && !state.manualMerges.has(row.formattedPhone);
      const rowClass = isUnresolvedDuplicate ? " class=\"duplicate-highlight\"" : "";
      const displayData = getDisplayData(row);
      const selected = state.selectedRowIds.has(row.id) ? " checked" : "";
      const rowCells = [
        "<td class=\"row-select-cell\"><input class=\"form-check-input row-select-check\" type=\"checkbox\" value=\"" + escapeAttribute(row.id) + "\" aria-label=\"Seleccionar fila " + row.sourceRowNumber + "\"" + selected + "></td>",
        "<td>" + row.sourceRowNumber + "</td>",
      ];

      state.headers.forEach(function (header) {
        rowCells.push(renderDataCell(row, header, displayData[header]));
      });

      rowCells.push("<td>" + renderStatusBadge(row) + "</td>");

      return "<tr" + rowClass + ">" + rowCells.join("") + "</tr>";
    }).join("");
  }

  function renderDataCell(row, header, value) {
    if (!isEditableHeader(header)) {
      return "<td><div class=\"cell-preview\" title=\"" + escapeAttribute(value) + "\">" + escapeHtml(value) + "</div></td>";
    }

    const isPhone = state.phoneColumns.includes(header);
    const phoneKey = row.formattedPhone || "";
    const isManual = state.manualMerges.has(phoneKey) && row.id === state.keepByPhone.get(phoneKey);
    const cleanValue = isPhone ? formatPhoneNumber(value) : value;

    return [
      "<td>",
      "<input class=\"form-control form-control-sm editable-cell-input\" type=\"text\" inputmode=\"" + (isPhone ? "numeric" : "text") + "\" data-row-id=\"" + escapeAttribute(row.id) + "\" data-field=\"" + escapeAttribute(header) + "\" data-kind=\"" + (isPhone ? "phone" : "text") + "\" data-manual=\"" + (isManual ? "true" : "false") + "\" data-phone-key=\"" + escapeAttribute(phoneKey) + "\" value=\"" + escapeAttribute(cleanValue) + "\">",
      "</td>",
    ].join("");
  }

  function updateSelectionUi() {
    pruneSelectedRows();

    const hasRows = state.rows.length > 0;
    const selectedCount = getSelectedRows().length;
    const visibleRows = getVisibleRows();
    const selectedVisibleCount = visibleRows.filter(function (row) {
      return state.selectedRowIds.has(row.id);
    }).length;
    const visibleCheck = document.getElementById("selectVisibleRowsCheck");

    els.bulkActionsBar.classList.toggle("d-none", !hasRows);
    els.bulkSelectionInfo.textContent = selectedCount + " seleccionadas";
    els.selectAllRowsButton.disabled = getSelectableRows().length === 0;
    els.bulkArgentinaCodeButton.disabled = selectedCount === 0;
    els.bulkDeleteRowsButton.disabled = selectedCount === 0;

    if (visibleCheck) {
      visibleCheck.checked = visibleRows.length > 0 && selectedVisibleCount === visibleRows.length;
      visibleCheck.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleRows.length;
      visibleCheck.disabled = visibleRows.length === 0;
    }
  }

  function pruneSelectedRows() {
    if (state.selectedRowIds.size === 0) return;

    const validRowIds = new Set(getSelectableRows().map(function (row) {
      return row.id;
    }));

    Array.from(state.selectedRowIds).forEach(function (rowId) {
      if (!validRowIds.has(rowId)) {
        state.selectedRowIds.delete(rowId);
      }
    });
  }

  function isEditableHeader(header) {
    return state.phoneColumns.includes(header) || header === state.nameColumn;
  }

  function handleTableCellInput(event) {
    const input = event.target.closest(".editable-cell-input");
    if (!input) return;

    if (input.dataset.kind === "phone") {
      input.value = formatPhoneNumber(input.value);
    }

    updateCellValue(input);
  }

  function handleTableCellCommit(event) {
    const input = event.target.closest(".editable-cell-input");
    if (!input) return;

    const shouldRebuild = updateCellValue(input);
    if (shouldRebuild) {
      rebuildDuplicateState();
      renderAll();
      updateControls();
    }
  }

  function updateCellValue(input) {
    const row = findProcessedRow(input.dataset.rowId);
    const sourceRow = findSourceRow(input.dataset.rowId);
    const header = input.dataset.field;
    const isPhone = input.dataset.kind === "phone";
    const value = isPhone ? formatPhoneNumber(input.value) : normalizeCell(input.value);

    input.value = value;

    if (!row || !header) return false;

    if (input.dataset.manual === "true") {
      const manualMerge = state.manualMerges.get(input.dataset.phoneKey);
      if (manualMerge) {
        manualMerge[header] = value;
      }
      return false;
    }

    row.data[header] = value;
    if (sourceRow) {
      sourceRow.data[header] = value;
    }

    if (isPhone) {
      if (header === state.phoneColumn) {
        row.originalPhone = value;
        row.formattedPhone = value;
        row.status = value ? "ok" : "empty";
      }

      return true;
    }

    return false;
  }

  function commitAllEditableInputs() {
    let shouldRebuild = false;
    els.previewTableBody.querySelectorAll(".editable-cell-input").forEach(function (input) {
      shouldRebuild = updateCellValue(input) || shouldRebuild;
    });

    if (shouldRebuild) {
      rebuildDuplicateState();
      renderAll();
      updateControls();
    }
  }

  function findProcessedRow(rowId) {
    return state.processedRows.find(function (row) {
      return row.id === rowId;
    });
  }

  function findSourceRow(rowId) {
    return state.rows.find(function (row) {
      return row.id === rowId;
    });
  }

  function getDisplayData(row) {
    if (!row.formattedPhone) return row.data;

    const keepId = state.keepByPhone.get(row.formattedPhone);
    const manualMerge = state.manualMerges.get(row.formattedPhone);

    if (manualMerge && row.id === keepId) {
      return manualMerge;
    }

    return row.data;
  }

  function renderStatusBadge(row) {
    if (!row.status) {
      return "<span class=\"badge text-bg-light border text-secondary\">Sin procesar</span>";
    }

    if (row.status === "duplicate") {
      const keepId = state.keepByPhone.get(row.formattedPhone);
      const label = row.id === keepId && state.manualMerges.has(row.formattedPhone) ? "Combinado" : "Duplicado";
      const color = label === "Combinado" ? "success" : "warning";
      return "<span class=\"badge text-bg-" + color + "\">" + label + "</span>";
    }

    if (row.status === "empty") {
      return "<span class=\"badge text-bg-secondary\">Vacio</span>";
    }

    return "<span class=\"badge text-bg-success\">OK</span>";
  }

  function getBestContactLabel(row) {
    const preferredHeaders = state.headers.filter(function (header) {
      const normalized = normalizeHeader(header);
      return normalized.includes("nombre") ||
        normalized.includes("name") ||
        normalized.includes("apellido") ||
        normalized.includes("email") ||
        normalized.includes("mail");
    });

    const bestHeader = preferredHeaders.find(function (header) {
      return normalizeCell(row.data[header]) !== "";
    });

    return bestHeader ? row.data[bestHeader] : "Sin dato descriptivo";
  }

  function exportRows(type) {
    commitAllEditableInputs();

    const cleanRows = getVisibleCleanRows();
    if (cleanRows.length === 0) {
      setStatus("No hay datos visibles para exportar.", "warning");
      return;
    }

    const exportData = buildTypedExportRows(cleanRows);
    const baseName = getSafeBaseName(state.fileName || "contactos");

    if (type === "vcf") {
      const vcf = buildVcfExport(cleanRows);
      if (!vcf) {
        setStatus("No hay telefonos validos para exportar como VCF.", "warning");
        return;
      }

      downloadBlob(vcf, baseName + "-limpio.vcf", "text/vcard;charset=utf-8");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData, { header: state.headers });
    applyWorksheetColumnTypes(worksheet, exportData.length);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "contactos");

    if (type === "csv") {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      downloadBlob("\ufeff" + csv, baseName + "-limpio.csv", "text/csv;charset=utf-8");
      return;
    }

    XLSX.writeFile(workbook, baseName + "-limpio.xlsx");
  }

  function buildVcfExport(rows) {
    return rows
      .map(function (row) {
        const phone = state.phoneColumn ? formatPhoneNumber(row[state.phoneColumn]) : "";
        if (!phone) return "";

        const name = getVcfContactName(row, phone);
        return [
          "BEGIN:VCARD",
          "VERSION:3.0",
          "FN:" + escapeVcfValue(name),
          "N:;" + escapeVcfValue(name) + ";;;",
          "TEL;TYPE=CELL:+" + phone,
          "END:VCARD",
        ].join("\r\n");
      })
      .filter(function (card) {
        return card !== "";
      })
      .join("\r\n");
  }

  function getVcfContactName(row, phone) {
    if (state.nameColumn && normalizeCell(row[state.nameColumn]) !== "") {
      return normalizeCell(row[state.nameColumn]);
    }

    const fallbackHeader = state.headers.find(function (header) {
      return header !== state.phoneColumn && normalizeCell(row[header]) !== "";
    });

    return fallbackHeader ? normalizeCell(row[fallbackHeader]) : phone;
  }

  function escapeVcfValue(value) {
    return normalizeCell(value)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function buildTypedExportRows(rows) {
    return rows.map(function (row) {
      const exportRow = Object.assign({}, row);

      state.phoneColumns.forEach(function (header) {
        if (normalizeCell(exportRow[header]) !== "") {
          exportRow[header] = Number(formatPhoneNumber(exportRow[header]));
        }
      });

      if (state.nameColumn) {
        exportRow[state.nameColumn] = normalizeCell(exportRow[state.nameColumn]);
      }

      return exportRow;
    });
  }

  function applyWorksheetColumnTypes(worksheet, rowCount) {
    const phoneColumnIndexes = state.phoneColumns
      .map(function (header) {
        return state.headers.indexOf(header);
      })
      .filter(function (index) {
        return index >= 0;
      });
    const nameColumnIndex = state.headers.indexOf(state.nameColumn);

    for (let rowIndex = 1; rowIndex <= rowCount; rowIndex += 1) {
      phoneColumnIndexes.forEach(function (phoneColumnIndex) {
        const phoneAddress = XLSX.utils.encode_cell({ r: rowIndex, c: phoneColumnIndex });
        const phoneCell = worksheet[phoneAddress];

        if (phoneCell && normalizeCell(phoneCell.v) !== "") {
          phoneCell.t = "n";
          phoneCell.v = Number(formatPhoneNumber(phoneCell.v));
          phoneCell.z = "0";
        }
      });

      if (nameColumnIndex >= 0) {
        const nameAddress = XLSX.utils.encode_cell({ r: rowIndex, c: nameColumnIndex });
        const nameCell = worksheet[nameAddress];

        if (nameCell) {
          nameCell.t = "s";
          nameCell.v = normalizeCell(nameCell.v);
          nameCell.z = "@";
        }
      }
    }
  }

  function downloadBlob(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function getSafeBaseName(fileName) {
    return fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "contactos";
  }

  function resetState() {
    els.fileInput.value = "";
    resetImportedData();
    setStatus("Subi un archivo para comenzar.", "secondary");
  }

  function resetImportedData() {
    state.headers = [];
    state.rows = [];
    state.fileName = "";
    state.phoneColumn = "";
    state.phoneColumns = [];
    state.nameColumn = "";
    state.statusFilter = "all";
    state.sortMode = "original";
    state.selectedRowIds.clear();
    resetRenderedRows();
    clearProcessedState();
    renderAll();
    updateControls();
  }

  function clearProcessedState() {
    state.processedRows = [];
    state.duplicateGroups = [];
    state.keepByPhone = new Map();
    state.manualMerges = new Map();
    state.activeMergePhone = "";
  }

  function updateControls() {
    const hasRows = state.rows.length > 0;
    const hasCleanRows = getCleanRows().length > 0;
    const hasPendingDuplicateGroups = getPendingDuplicateGroups().length > 0;

    els.statusFilterSelect.disabled = !hasRows;
    els.statusFilterSelect.value = state.statusFilter;
    els.sortSelect.disabled = !hasRows;
    els.sortSelect.value = state.sortMode;
    els.editColumnsButton.disabled = !hasRows;
    els.combineDuplicatesButton.disabled = !hasPendingDuplicateGroups;
    els.exportDropdownButton.disabled = !hasCleanRows;
    els.exportCsvButton.disabled = !hasCleanRows;
    els.exportXlsxButton.disabled = !hasCleanRows;
    els.exportVcfButton.disabled = !hasCleanRows;
    els.resetButton.disabled = !hasRows;
    updateSelectionUi();
  }

  function setStatus(message, type) {
    if (!els.statusAlert) return;
    els.statusAlert.className = "alert alert-" + type + " mt-3 mb-0";
    els.statusAlert.textContent = message;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();















