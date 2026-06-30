import React, { useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface DobDatePickerProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (value: number) => String(value).padStart(2, "0");

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map((part) => parseInt(part, 10));
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDob(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return "";
  return `${pad(parsed.day)} ${MONTHS[parsed.month - 1]} ${parsed.year}`;
}

export default function DobDatePicker({
  label = "Date of Birth",
  required = false,
  value,
  onChange,
  placeholder = "Select date of birth",
}: DobDatePickerProps) {
  const today = new Date();
  const initial = parseIsoDate(value) || {
    year: today.getFullYear() - 18,
    month: 1,
    day: 1,
  };

  const minYear = today.getFullYear() - 120;
  const maxYear = today.getFullYear();

  const [open, setOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(initial.year);
  const [selectedMonth, setSelectedMonth] = useState(initial.month);
  const [selectedDay, setSelectedDay] = useState(initial.day);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let year = maxYear; year >= minYear; year--) list.push(year);
    return list;
  }, [maxYear, minYear]);

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth(selectedYear, selectedMonth) }, (_, index) => index + 1);
  }, [selectedMonth, selectedYear]);

  const setMonth = (month: number) => {
    setSelectedMonth(month);
    const maxDay = daysInMonth(selectedYear, month);
    if (selectedDay > maxDay) setSelectedDay(maxDay);
  };

  const setYear = (year: number) => {
    setSelectedYear(year);
    const maxDay = daysInMonth(year, selectedMonth);
    if (selectedDay > maxDay) setSelectedDay(maxDay);
  };

  const confirm = () => {
    onChange(`${selectedYear}-${pad(selectedMonth)}-${pad(selectedDay)}`);
    setOpen(false);
  };

  const displayValue = formatDob(value);

  return (
    <View style={s.wrap}>
      {label ? (
        <Text style={s.label}>
          {label} {required ? <Text style={s.required}>*</Text> : null}
        </Text>
      ) : null}

      <TouchableOpacity style={s.input} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Feather name="calendar" size={14} color={value ? "#EA580C" : "#94A3B8"} />
        <Text style={[s.inputText, !value && s.placeholder]}>{displayValue || placeholder}</Text>
        <Feather name="chevron-down" size={14} color="#94A3B8" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.header}>
              <Text style={s.title}>{label || "Date of Birth"}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={s.closeBtn}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={s.pickerRow}>
              <View style={s.column}>
                <Text style={s.columnTitle}>Day</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={s.columnScroll}>
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[s.option, selectedDay === day && s.optionActive]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text style={[s.optionText, selectedDay === day && s.optionTextActive]}>{pad(day)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={s.column}>
                <Text style={s.columnTitle}>Month</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={s.columnScroll}>
                  {MONTHS.map((month, index) => {
                    const monthNumber = index + 1;
                    return (
                      <TouchableOpacity
                        key={month}
                        style={[s.option, selectedMonth === monthNumber && s.optionActive]}
                        onPress={() => setMonth(monthNumber)}
                      >
                        <Text style={[s.optionText, selectedMonth === monthNumber && s.optionTextActive]}>{month}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={s.column}>
                <Text style={s.columnTitle}>Year</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={s.columnScroll}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[s.option, selectedYear === year && s.optionActive]}
                      onPress={() => setYear(year)}
                    >
                      <Text style={[s.optionText, selectedYear === year && s.optionTextActive]}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={s.actions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setOpen(false)} activeOpacity={0.85}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={confirm} activeOpacity={0.85}>
                <Text style={s.confirmText}>Confirm Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 4 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    fontFamily: "Inter_600SemiBold",
    marginTop: 10,
    marginBottom: 4,
    paddingLeft: 2,
  },
  required: { color: "#DC2626" },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    fontFamily: "Inter_400Regular",
  },
  placeholder: { color: "#94A3B8" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "78%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerRow: { flexDirection: "row", gap: 10 },
  column: { flex: 1 },
  columnTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    textAlign: "center",
    marginBottom: 8,
    textTransform: "uppercase",
    fontFamily: "Inter_700Bold",
  },
  columnScroll: { maxHeight: 260 },
  option: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 6,
    backgroundColor: "#F8FAFC",
  },
  optionActive: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  optionText: {
    fontSize: 14,
    color: "#475569",
    fontFamily: "Inter_600SemiBold",
  },
  optionTextActive: { color: "#EA580C", fontWeight: "800" },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#EA580C",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    fontFamily: "Inter_700Bold",
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "800",
    color: "white",
    fontFamily: "Inter_700Bold",
  },
});
