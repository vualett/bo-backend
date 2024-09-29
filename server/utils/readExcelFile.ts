import { read, utils } from 'xlsx';

interface ExcelData {
  [key: string]: unknown;
}

export const readExcelFile = async (file: File): Promise<ExcelData[]> => {
  const contents = await file.arrayBuffer();

  const workbook = read(contents, { type: 'array' });
  const keyword = workbook.SheetNames.shift() ?? '';

  const worksheet = workbook.Sheets[keyword];
  const jsonWorksheet = utils.sheet_to_json(worksheet);

  return jsonWorksheet as ExcelData[];
};
