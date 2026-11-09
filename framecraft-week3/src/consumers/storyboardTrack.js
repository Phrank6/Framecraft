/** Example cross-team consumer: storyboard renderer reads data through published contracts. */
import { ShotSchema, TimelineSchema } from '../schema/index.js';
export function listStoryboardFrames(project) {
    TimelineSchema.parse(project.timeline);
    return project.timeline.clips.map(clip => {
        const shot = ShotSchema.parse(project.shots.find(shot => shot.id === clip.shot_id));
        const layout = project.scene_layouts.find(layout => layout.scene_id === shot.scene_id);
        const camera = layout?.camera_poses.find(camera => camera.shot_id === shot.id);
        if (!camera)
            throw new Error(`No camera for shot ${shot.id}`);
        return { shotId: shot.id, camera, startSeconds: clip.start_seconds, durationSeconds: clip.duration_seconds };
    });
}
