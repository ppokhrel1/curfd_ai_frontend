import { beforeEach, describe, expect, it } from "vitest";
import { SDFParser } from "../../../../../src/modules/viewer/utils/SDFParser";

describe("SDFParser", () => {
    let parser: SDFParser;

    beforeEach(() => {
        parser = new SDFParser();
    });

    const mockSdf = `
    <sdf version="1.6">
      <model name="test_model">
        <pose>0 0 1 0 0 0</pose>
        <link name="test_link">
          <pose>1 0 0 0 0 0</pose>
          <visual name="test_visual">
            <pose>0 1 0 0 0 0</pose>
            <geometry>
              <mesh>
                <uri>model://test_model/meshes/mesh.stl</uri>
                <scale>2 2 2</scale>
              </mesh>
            </geometry>
          </visual>
        </link>
      </model>
    </sdf>
  `;

    it("should parse SDF content and extract visuals with combined poses", () => {
        const visuals = parser.parse(mockSdf);

        expect(visuals).toHaveLength(1);
        const visual = visuals[0];

        expect(visual.name).toBe("test_visual");
        expect(visual.meshPath).toBe("meshes/mesh.stl");
        expect(visual.scale.x).toBe(2);
        expect(visual.scale.y).toBe(2);
        expect(visual.scale.z).toBe(2);

        expect(visual.pose.position.x).toBeCloseTo(1);
        expect(visual.pose.position.y).toBeCloseTo(1);
        expect(visual.pose.position.z).toBeCloseTo(1);
    });

    it("should handle missing pose and scale tags with defaults", () => {
        const simpleSdf = `
      <sdf version="1.6">
        <model name="simple">
          <link name="link">
            <visual name="visual">
              <geometry>
                <mesh>
                  <uri>model://simple/mesh.obj</uri>
                </mesh>
              </geometry>
            </visual>
          </link>
        </model>
      </sdf>
    `;
        const visuals = parser.parse(simpleSdf);
        expect(visuals[0].pose.position.x).toBe(0);
        expect(visuals[0].scale.x).toBe(1);
    });

    it("should clean URIs correctly", () => {
        const cleaned = (parser as any).cleanUri("model://my_robot/meshes/part.dae");
        expect(cleaned).toBe("meshes/part.dae");
    });

    it("should parse vectors correctly", () => {
        const vec = (parser as any).parseVector("1.5 2.5 3.5");
        expect(vec.x).toBe(1.5);
        expect(vec.y).toBe(2.5);
        expect(vec.z).toBe(3.5);
    });

    it("should return default vector for invalid input", () => {
        const vec = (parser as any).parseVector("invalid");
        expect(vec.x).toBe(1);
        expect(vec.y).toBe(1);
        expect(vec.z).toBe(1);
    });
});
