import { SubmoduleRenderServiceShape } from '@/render/shape';
import { SubmoduleRenderServiceText } from '@/render/text';

export class RenderService {
  public static readonly shape = new SubmoduleRenderServiceShape();

  public static readonly text = new SubmoduleRenderServiceText();
}
