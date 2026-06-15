import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { EventsService } from "./events.service";

class CreateEventDto {
  name!: string;
  date!: string;
  expiry!: string;
  pricing_tier?: string;
}

class UpdateEventDto {
  name?: string;
  date?: string;
  expiry?: string;
  pricing_tier?: string;
}

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateEventDto) {
    return this.eventsService.create({
      name: body.name,
      date: new Date(body.date),
      expiry: new Date(body.expiry),
      pricing_tier: (body.pricing_tier as "FREE" | "STANDARD" | "PREMIUM") || "FREE",
    });
  }

  @Get()
  async findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const pageNum = parseInt(page || "1", 10);
    const limitNum = parseInt(limit || "20", 10);
    return this.eventsService.findAll(pageNum, limitNum);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const event = await this.eventsService.findOne(id);
    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    return event;
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: UpdateEventDto) {
    const event = await this.eventsService.update(id, {
      name: body.name,
      date: body.date ? new Date(body.date) : undefined,
      expiry: body.expiry ? new Date(body.expiry) : undefined,
      pricing_tier: body.pricing_tier as "FREE" | "STANDARD" | "PREMIUM" | undefined,
    });
    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    return event;
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.eventsService.remove(id);
  }
}
