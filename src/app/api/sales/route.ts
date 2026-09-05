import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse pagination params
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    
    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: "Invalid page parameter" }, { status: 400 });
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Invalid limit parameter" }, { status: 400 });
    }
    
    const skip = (page - 1) * limit;

    // Parse filters
    const agentDni = searchParams.get("agentDni");
    const queue = searchParams.get("queue");
    const estado = searchParams.get("estado"); // PENDIENTE, ACTIVADO, CAIDA

    // Build Prisma query condition
    const where: any = {};
    
    if (agentDni) {
      where.dniAsesor = agentDni;
    }
    
    if (queue) {
      // In Prisma, we mapped queue as an enum
      where.agent = {
        queue: queue
      };
    }
    
    if (estado) {
      where.estado = estado;
    }

    // Fetch data and count total records in parallel
    const [sales, total] = await prisma.$transaction([
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          marcaTemporal: "desc"
        },
        include: {
          agent: {
            select: {
              name: true,
              queue: true,
              role: true
            }
          }
        }
      }),
      prisma.sale.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: sales,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error: any) {
    console.error("Error in GET /api/sales:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
