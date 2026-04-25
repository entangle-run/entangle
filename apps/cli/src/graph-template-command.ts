export type GraphTemplateSummary = {
  description: string;
  graphPath: string;
  templateId: string;
};

const graphTemplates: GraphTemplateSummary[] = [
  {
    description:
      "Canonical Local Preview graph with a user node, planner runtime, local relay, and local package binding.",
    graphPath: "examples/local-preview/graph.json",
    templateId: "local-preview"
  }
];

export function listGraphTemplates(): GraphTemplateSummary[] {
  return [...graphTemplates];
}

export function getGraphTemplate(
  templateId: string
): GraphTemplateSummary | undefined {
  return graphTemplates.find((template) => template.templateId === templateId);
}
