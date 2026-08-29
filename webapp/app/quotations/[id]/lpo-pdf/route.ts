import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    select: { departmentId: true, customerLpoFileName: true, customerLpoFileData: true },
  });
  if (!quotation || !quotation.customerLpoFileData) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!user.role.isAdmin && quotation.departmentId !== user.departmentId) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(quotation.customerLpoFileData), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${(quotation.customerLpoFileName ?? "lpo.pdf").replace(/"/g, "")}"`,
    },
  });
}
