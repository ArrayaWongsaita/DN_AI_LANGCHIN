import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DocumentsController } from "./documents.controller.js";
import { EMBEDDINGS, KnowledgeService, LazyEmbeddings } from "./knowledge.service.js";

@Module({
  imports: [AuthModule],
  controllers: [DocumentsController],
  providers: [{ provide: EMBEDDINGS, useFactory: () => new LazyEmbeddings() }, KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
